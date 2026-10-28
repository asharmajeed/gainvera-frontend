import type {
  ApiAnalysis,
  ApiAnalysisState, ApiAnalyzeInput, ApiScenarioSaveInput, ApiReportDownload,
  ApiErrorDetail,
  ApiFieldIssue,
  ApiHealth,
  ApiMeasurementInput,
  ApiPage,
  ApiWorkflow,
  ApiWorkflowCreate,
  ApiWorkflowPatch,
  ApiWorkspace,
  ApiWorkspaceCreate,
} from "./types";
import { analyzeInputBody, measurementInputBody, scenarioSaveBody, workflowCreateBody, workflowPatchBody, workspaceCreateBody } from "./validation";
import { decodeAnalysisState, decodeScenarioState, decodeDashboard, decodeBaselines, decodeMeasurements, decodeMeasurement } from "./results-decoder";

export type AccessTokenSupplier = () => string | null | Promise<string | null>;
export interface ApiCallOptions {
  signal?: AbortSignal;
  requestId?: string;
}
/** Client metadata, not an extra wrapper expected from the HTTP response body. */
export interface ApiResult<T> {
  body: T;
  status: number | null;
  requestId: string | null;
}
export interface GainveraReadSource<AnalysisResponse = ApiAnalysis> {
  readonly mode: "http" | "development_fixture";
  readonly label: string;
  getWorkflow(id: string, options?: ApiCallOptions): Promise<ApiResult<ApiWorkflow>>;
  getAnalysis(workflowId: string, options?: ApiCallOptions): Promise<ApiResult<AnalysisResponse>>;
}
export type ApiFailureKind = "http" | "network" | "aborted" | "protocol" | "auth" | "input";
export class ApiClientError extends Error {
  readonly name = "ApiClientError";

  constructor(
    readonly kind: ApiFailureKind,
    readonly code: string,
    message: string,
    readonly status: number | null = null,
    readonly requestId: string | null = null,
    readonly details: ApiFieldIssue[] = [],
    readonly retryable = false,
    readonly bodyRequestId: string | null = null,
  ) {
    super(message);
  }
}

export interface HttpClientOptions {
  baseUrl: string;
  getAccessToken?: AccessTokenSupplier;
  fetch?: typeof globalThis.fetch;
}
interface RequestOptions extends ApiCallOptions {
  accept?: "application/json" | "text/html";
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: "required" | "none";
}
export interface ApiListOptions extends ApiCallOptions {
  limit?: number;
  cursor?: string;
}
function pageQuery(options: ApiListOptions = {}) {
  const query = new URLSearchParams();
  if (options.limit !== undefined) {
    if (!Number.isInteger(options.limit) || options.limit < 1 || options.limit > 100)
      throw new ApiClientError("input", "invalid_limit", "Page size must be an integer from 1 to 100.");
    query.set("limit", String(options.limit));
  }
  if (options.cursor !== undefined) {
    if (typeof options.cursor !== "string" || options.cursor.length > 1024)
      throw new ApiClientError("input", "invalid_cursor", "The cursor must be a string of at most 1024 characters.");
    query.set("cursor", options.cursor);
  }
  return query;
}
const uuidV4 = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const requestIdFrom = (value: unknown) =>
  typeof value === "string" && uuidV4.test(value) ? value.toLowerCase() : null;

function errorDetail(value: unknown): ApiErrorDetail | null {
  if (!isObject(value) || !isObject(value.error)) return null;
  const e = value.error;
  if (typeof e.code !== "string" || typeof e.message !== "string" ||
      !requestIdFrom(e.request_id) || typeof e.retryable !== "boolean" ||
      !Array.isArray(e.details) || !e.details.every((d: unknown) =>
        isObject(d) && typeof d.field === "string" &&
        typeof d.code === "string" && typeof d.message === "string")) return null;
  return {
    code: e.code,
    message: e.message,
    request_id: e.request_id as string,
    retryable: e.retryable,
    details: e.details.map((d) => ({ field: d.field, code: d.code, message: d.message })),
  };
}

/** No environment defaults, token storage, cookie auth, fallback or automatic retries. */
export function createHttpClient(config: HttpClientOptions) {
  let base: URL;
  try {
    base = new URL(config.baseUrl);
    if (!["http:", "https:"].includes(base.protocol) || base.username ||
        base.password || base.search || base.hash) throw Error();
  } catch {
    throw new ApiClientError("input", "invalid_base_url", "Configure an HTTP(S) API base URL without credentials, query or fragment.");
  }
  const baseUrl = base.href.replace(/\/+$/, "");
  const fetcher = config.fetch ?? globalThis.fetch.bind(globalThis);

  async function perform(path: string, options: RequestOptions = {}) {
    // Only API-relative paths are accepted; bearer credentials stay on this base.
    let url: URL;
    try {
      if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) throw Error();
      url = new URL(`${baseUrl}${path}`);
      if (url.origin !== base.origin || url.hash || !url.href.startsWith(`${baseUrl}/`)) throw Error();
    } catch {
      throw new ApiClientError("input", "invalid_path", "Use a path within the configured API base URL.");
    }
    const headers = new Headers({ Accept: options.accept ?? "application/json" });
    const sentRequestId = requestIdFrom(options.requestId);
    if (options.requestId !== undefined) {
      if (!sentRequestId) throw new ApiClientError("input", "invalid_request_id", "The request ID must be a UUID v4.");
      headers.set("X-Request-ID", sentRequestId);
    }
    let body: string | undefined;
    if (options.body !== undefined) {
      try {
        body = JSON.stringify(options.body, (_key, value: unknown) => {
          if (typeof value === "number" && !Number.isFinite(value)) throw Error();
          return value;
        });
        if (body === undefined) throw Error();
      } catch {
        throw new ApiClientError("input", "invalid_json_body", "The request body must be finite, serializable JSON.");
      }
      headers.set("Content-Type", "application/json");
    }
    if (options.signal?.aborted)
      throw new ApiClientError("aborted", "request_aborted", "The request was cancelled.", null, sentRequestId);
    if (options.auth !== "none") {
      let token: string | null;
      try {
        token = await config.getAccessToken?.() ?? null;
        if (token !== null && (typeof token !== "string" || /\s/.test(token))) throw Error();
        if (token) headers.set("Authorization", `Bearer ${token}`);
      } catch {
        // Provider exceptions can contain credentials; never retain their text/cause.
        throw new ApiClientError("auth", "token_unavailable", "The access token could not be obtained.");
      }
      if (!token) throw new ApiClientError("auth", "unauthenticated", "Sign in before requesting business data.");
    }
    if (options.signal?.aborted)
      throw new ApiClientError("aborted", "request_aborted", "The request was cancelled.", null, sentRequestId);
    let response: Response;
    try {
      response = await fetcher(url.href, {
        method: options.method ?? "GET",
        body,
        headers,
        signal: options.signal,
        credentials: "omit",
        redirect: "error",
        cache: "no-store",
      });
    } catch {
      if (options.signal?.aborted)
        throw new ApiClientError("aborted", "request_aborted", "The request was cancelled.", null, sentRequestId);
      throw new ApiClientError("network", "network_error", "The API could not be reached. The request outcome is unknown.", null, sentRequestId, [], true);
    }
    const requestId = requestIdFrom(response.headers.get("X-Request-ID"));
    let raw: string;
    try {
      raw = await response.text();
    } catch {
      if (options.signal?.aborted)
        throw new ApiClientError("aborted", "request_aborted", "The request was cancelled.", response.status, requestId);
      throw new ApiClientError("network", "response_read_failed", "The API response could not be read. The request outcome is unknown.", response.status, requestId, [], true);
    }
    let parsed: unknown;
    try { parsed = raw.trim() ? JSON.parse(raw) : undefined; } catch { /* handled below */ }
    if (!response.ok) {
      const detail = errorDetail(parsed);
      throw new ApiClientError(
        "http", detail?.code ?? "http_error",
        detail?.message ?? "The API request failed without a valid error envelope.",
        response.status, requestId ?? requestIdFrom(detail?.request_id),
        detail?.details ?? [], detail?.retryable ?? [429, 503].includes(response.status),
        requestIdFrom(detail?.request_id),
      );
    }
    return { response, requestId, parsed, raw };
  }

  return {
    async requestReport(path: string, options?: ApiCallOptions): Promise<ApiResult<ApiReportDownload>> {
      const result = await perform(path, { ...options, accept: "text/html" });
      if (!/^text\/html(?:;|$)/i.test(result.response.headers.get("Content-Type") ?? "") || !result.raw.trim())
        throw new ApiClientError("protocol", "invalid_report_response", "Expected a nonempty HTML report attachment.", result.response.status, result.requestId);
      const candidate = result.response.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/i)?.[1];
      const filename = candidate && /^[a-z0-9][a-z0-9._-]{0,100}\.html$/i.test(candidate) && !candidate.includes("..") ? candidate : "gainvera-audit.html";
      return { body: { blob: new Blob([result.raw], { type: "text/html;charset=utf-8" }), filename }, status: result.response.status, requestId: result.requestId };
    },
    async requestJson<T>(path: string, options?: RequestOptions): Promise<ApiResult<T>> {
      const result = await perform(path, options);
      if (!isObject(result.parsed) || !/\bapplication\/(?:[\w.+-]+\+)?json\b/i.test(result.response.headers.get("Content-Type") ?? ""))
        throw new ApiClientError("protocol", "invalid_json_response", "Expected a JSON object from the API.", result.response.status, result.requestId);
      return { body: result.parsed as T, status: result.response.status, requestId: result.requestId };
    },
    async requestEmpty(path: string, options?: RequestOptions): Promise<ApiResult<void>> {
      const result = await perform(path, options);
      if (result.response.status !== 204 || result.raw.trim())
        throw new ApiClientError("protocol", "invalid_empty_response", "Expected an empty 204 response from the API.", result.response.status, result.requestId);
      return { body: undefined, status: result.response.status, requestId: result.requestId };
    },
  };
}

async function decoded<T>(promise: Promise<ApiResult<unknown>>, decode: (value: unknown) => T): Promise<ApiResult<T>> {
  const result = await promise;
  try { return { ...result, body: decode(result.body) }; }
  catch { throw new ApiClientError("protocol", "invalid_result_response", "The API response does not match the agreed v2 result contract.", result.status, result.requestId); }
}

/** Current companion backend API v2.0; no fallback, invented scores or local ROI. */
export function createGainveraHttpClient(config: HttpClientOptions) {
  const http = createHttpClient(config);
  return {
    mode: "http" as const,
    label: "HTTP API",
    getHealth: (options?: ApiCallOptions) =>
      http.requestJson<ApiHealth>("/health", { ...options, auth: "none" }),
    listWorkspaces: (options: ApiListOptions = {}) =>
      http.requestJson<ApiPage<ApiWorkspace>>(`/workspaces?${pageQuery(options)}`, options),
    listWorkflows: (workspaceId: string, options: ApiListOptions = {}) => {
      const query = pageQuery(options);
      query.set("workspace_id", workspaceId);
      return http.requestJson<ApiPage<ApiWorkflow>>(`/workflows?${query}`, options);
    },
    getWorkflow: (id: string, options?: ApiCallOptions) =>
      http.requestJson<ApiWorkflow>(`/workflows/${encodeURIComponent(id)}`, options),
    getAnalysis: (id: string, options?: ApiCallOptions) =>
      decoded(http.requestJson(`/workflows/${encodeURIComponent(id)}/analysis`, options), decodeAnalysisState),
    analyzeWorkflow: (id: string, input: ApiAnalyzeInput, options?: ApiCallOptions) =>
      decoded(http.requestJson(`/workflows/${encodeURIComponent(id)}/analyze`, { ...options, method: "POST", body: analyzeInputBody(input) }), decodeAnalysisState),
    getScenario: (id: string, options: ApiCallOptions & { baselineVersion?: number } = {}) => {
      if (options.baselineVersion !== undefined && (!Number.isSafeInteger(options.baselineVersion) || options.baselineVersion < 1)) throw new ApiClientError("input", "invalid_version", "Select a positive baseline version.");
      return decoded(http.requestJson(`/workflows/${encodeURIComponent(id)}/scenario${options.baselineVersion === undefined ? "" : `?baseline_version=${options.baselineVersion}`}`, options), decodeScenarioState);
    },
    saveScenario: (id: string, input: ApiScenarioSaveInput, options?: ApiCallOptions) =>
      decoded(http.requestJson(`/workflows/${encodeURIComponent(id)}/scenario`, { ...options, method: "PUT", body: scenarioSaveBody(input) }), decodeScenarioState),
    listBaselines: (id: string, options: ApiListOptions = {}) =>
      decoded(http.requestJson(`/workflows/${encodeURIComponent(id)}/baselines?${pageQuery(options)}`, options), decodeBaselines),
    listMeasurements: (id: string, options: ApiListOptions = {}) =>
      decoded(http.requestJson(`/workflows/${encodeURIComponent(id)}/measurements?${pageQuery(options)}`, options), decodeMeasurements),
    getDashboard: (workspaceId: string, options?: ApiCallOptions) =>
      decoded(http.requestJson(`/dashboard?${new URLSearchParams({ workspace_id: workspaceId })}`, options), decodeDashboard),
    getReport: (workspaceId: string, options?: ApiCallOptions) =>
      http.requestReport(`/reports/${encodeURIComponent(workspaceId)}`, options),
    createWorkspace: (input: ApiWorkspaceCreate, options?: ApiCallOptions) =>
      http.requestJson<ApiWorkspace>("/workspaces", { ...options, method: "POST", body: workspaceCreateBody(input) }),
    createWorkflow: (input: ApiWorkflowCreate, options?: ApiCallOptions) =>
      http.requestJson<ApiWorkflow>("/workflows", { ...options, method: "POST", body: workflowCreateBody(input) }),
    patchWorkflow: (id: string, input: ApiWorkflowPatch, options?: ApiCallOptions) =>
      http.requestJson<ApiWorkflow>(`/workflows/${encodeURIComponent(id)}`, { ...options, method: "PATCH", body: workflowPatchBody(input) }),
    deleteWorkflow: (id: string, options?: ApiCallOptions) =>
      http.requestEmpty(`/workflows/${encodeURIComponent(id)}`, { ...options, method: "DELETE" }),
    createMeasurement: (id: string, input: ApiMeasurementInput, options?: ApiCallOptions) =>
      decoded(http.requestJson(`/workflows/${encodeURIComponent(id)}/measurements`, { ...options, method: "POST", body: measurementInputBody(input) }), decodeMeasurement),
  } satisfies GainveraReadSource<ApiAnalysisState> & Record<string, unknown>;
}
