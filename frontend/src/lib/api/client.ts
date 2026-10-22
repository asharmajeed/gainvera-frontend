import type {
  ApiAnalysis,
  ApiErrorDetail,
  ApiFieldIssue,
  ApiHealth,
  ApiMeasurement,
  ApiMeasurementInput,
  ApiPage,
  ApiWorkflow,
  ApiWorkflowCreate,
  ApiWorkflowPatch,
  ApiWorkspace,
  ApiWorkspaceCreate,
} from "./types";
import { measurementInputBody, workflowCreateBody, workflowPatchBody, workspaceCreateBody } from "./validation";

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
export interface GainveraReadSource {
  readonly mode: "http" | "development_fixture";
  readonly label: string;
  getWorkflow(id: string, options?: ApiCallOptions): Promise<ApiResult<ApiWorkflow>>;
  getAnalysis(workflowId: string, options?: ApiCallOptions): Promise<ApiResult<ApiAnalysis>>;
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
    const headers = new Headers({ Accept: "application/json" });
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

/** Persistence bindings are implemented by B; analysis/measurement remain planned. */
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
      http.requestJson<ApiAnalysis>(`/workflows/${encodeURIComponent(id)}/analysis`, options),
    createWorkspace: (input: ApiWorkspaceCreate, options?: ApiCallOptions) =>
      http.requestJson<ApiWorkspace>("/workspaces", { ...options, method: "POST", body: workspaceCreateBody(input) }),
    createWorkflow: (input: ApiWorkflowCreate, options?: ApiCallOptions) =>
      http.requestJson<ApiWorkflow>("/workflows", { ...options, method: "POST", body: workflowCreateBody(input) }),
    patchWorkflow: (id: string, input: ApiWorkflowPatch, options?: ApiCallOptions) =>
      http.requestJson<ApiWorkflow>(`/workflows/${encodeURIComponent(id)}`, { ...options, method: "PATCH", body: workflowPatchBody(input) }),
    deleteWorkflow: (id: string, options?: ApiCallOptions) =>
      http.requestEmpty(`/workflows/${encodeURIComponent(id)}`, { ...options, method: "DELETE" }),
    createMeasurement: (id: string, input: ApiMeasurementInput, options?: ApiCallOptions) =>
      http.requestJson<ApiMeasurement>(`/workflows/${encodeURIComponent(id)}/measurements`, { ...options, method: "POST", body: measurementInputBody(input) }),
  } satisfies GainveraReadSource & Record<string, unknown>;
}
