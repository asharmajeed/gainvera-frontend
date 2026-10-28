import type {
  ApiFieldIssue,
  ApiAnalyzeInput,
  ApiMeasurementInput,
  ApiScenarioInput,
  ApiScenarioSaveInput,
  ApiWorkflowCreate,
  ApiWorkflowPatch,
  ApiWorkspaceCreate,
} from "./types";

/** Contains field names and safe messages, never submitted values. */
export class ApiInputError extends Error {
  readonly details: ApiFieldIssue[];

  constructor(field: string, message: string) {
    super(message);
    this.name = "ApiInputError";
    this.details = [{ field: `body.${field}`, code: "invalid_value", message }];
  }
}

function text(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string")
    throw new ApiInputError(field, "A text value is required.");
  const trimmed = value.trim();
  const length = [...trimmed].length;
  if (length < min || length > max)
    throw new ApiInputError(field, "The text length is outside the allowed range.");
  return trimmed;
}

function number(value: unknown, field: string, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max)
    throw new ApiInputError(field, "A finite number within the allowed range is required.");
  return value;
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean")
    throw new ApiInputError(field, "A boolean is required.");
  return value;
}

function choice<T extends string>(value: unknown, field: string, values: readonly T[]): T {
  if (!values.includes(value as T))
    throw new ApiInputError(field, "Choose one of the documented values.");
  return value as T;
}

function version(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    throw new ApiInputError("baseline_version", "A positive integer version is required.");
  return value;
}

function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value))
    throw new ApiInputError(field, "A valid UUID is required.");
  return value;
}

/** Explicit whitelists discard read metadata, even when a read object is supplied. */
export function workspaceCreateBody(input: ApiWorkspaceCreate): Required<ApiWorkspaceCreate> {
  return {
    name: text(input.name, "name", 1, 100),
    currency: choice(input.currency === undefined ? "USD" : input.currency, "currency", ["USD"]),
  };
}

export function workflowCreateBody(input: ApiWorkflowCreate): Required<ApiWorkflowCreate> {
  return {
    workspace_id: uuid(input.workspace_id, "workspace_id"),
    name: text(input.name, "name", 1, 100),
    description: text(input.description, "description", 8, 3000),
    hours_per_occurrence: number(input.hours_per_occurrence, "hours_per_occurrence", 744),
    occurrences_per_month: number(input.occurrences_per_month, "occurrences_per_month", 10_000),
    hourly_cost: number(input.hourly_cost, "hourly_cost", 100_000),
    current_tools: text(input.current_tools === undefined ? "" : input.current_tools, "current_tools", 0, 300),
    pain_points: text(input.pain_points === undefined ? "" : input.pain_points, "pain_points", 0, 500),
    risk: choice(input.risk === undefined ? "unknown" : input.risk, "risk", ["unknown", "low", "medium", "high"]),
    data_availability: choice(input.data_availability === undefined ? "unknown" : input.data_availability, "data_availability", ["unknown", "digital", "manual"]),
    is_sample: boolean(input.is_sample === undefined ? false : input.is_sample, "is_sample"),
  };
}

/** PATCH omits unchanged fields; explicit nulls/protected fields are invalid. */
export function workflowPatchBody(input: ApiWorkflowPatch): ApiWorkflowPatch {
  const output: Record<string, unknown> = { baseline_version: version(input.baseline_version) };
  for (const [key, value] of Object.entries(input)) {
    if (key === "baseline_version") continue;
    switch (key) {
      case "name": output[key] = text(value, key, 1, 100); break;
      case "description": output[key] = text(value, key, 8, 3000); break;
      case "hours_per_occurrence": output[key] = number(value, key, 744); break;
      case "occurrences_per_month": output[key] = number(value, key, 10_000); break;
      case "hourly_cost": output[key] = number(value, key, 100_000); break;
      case "current_tools": output[key] = text(value, key, 0, 300); break;
      case "pain_points": output[key] = text(value, key, 0, 500); break;
      case "risk": output[key] = choice(value, key, ["unknown", "low", "medium", "high"]); break;
      case "data_availability": output[key] = choice(value, key, ["unknown", "digital", "manual"]); break;
      case "is_sample": output[key] = boolean(value, key); break;
      default: throw new ApiInputError("field", "An unsupported edit field was supplied.");
    }
  }
  if (Object.keys(output).length === 1)
    throw new ApiInputError("baseline_version", "Supply at least one editable field.");
  return output as ApiWorkflowPatch;
}

export function scenarioInputBody(input: ApiScenarioInput): ApiScenarioInput {
  return {
    baseline_version: version(input.baseline_version),
    reduction_percent: number(input.reduction_percent, "reduction_percent", 100),
    setup_hours: number(input.setup_hours, "setup_hours", 744),
    setup_fees: number(input.setup_fees, "setup_fees", 1_000_000),
    monthly_tool_fees: number(input.monthly_tool_fees, "monthly_tool_fees", 1_000_000),
    monthly_maintenance_hours: number(input.monthly_maintenance_hours, "monthly_maintenance_hours", 744),
  };
}

export function analyzeInputBody(input: ApiAnalyzeInput): Required<ApiAnalyzeInput> {
  return { baseline_version: version(input.baseline_version), guidance_preference: choice(input.guidance_preference ?? "auto", "guidance_preference", ["auto", "reviewed_playbook"]) };
}

export function scenarioSaveBody(input: ApiScenarioSaveInput): ApiScenarioSaveInput {
  if (!Object.hasOwn(input, "expected_updated_at") || (input.expected_updated_at !== null &&
      (typeof input.expected_updated_at !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(input.expected_updated_at))))
    throw new ApiInputError("expected_updated_at", "Supply null for a first save or the exact saved timestamp, including its timezone.");
  return { ...scenarioInputBody(input), analysis_id: uuid(input.analysis_id, "analysis_id"), expected_updated_at: input.expected_updated_at };
}

export function measurementInputBody(input: ApiMeasurementInput): Required<ApiMeasurementInput> {
  const period = text(input.period, "period", 7, 7);
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(period))
    throw new ApiInputError("period", "Use a valid month in YYYY-MM form.");
  return {
    baseline_version: version(input.baseline_version),
    period,
    production_and_review_hours_after: number(input.production_and_review_hours_after, "production_and_review_hours_after", 744),
    maintenance_hours_after: number(input.maintenance_hours_after, "maintenance_hours_after", 744),
    monthly_tools_and_fees: number(input.monthly_tools_and_fees, "monthly_tools_and_fees", 1_000_000),
    initial_implementation_cost: number(input.initial_implementation_cost, "initial_implementation_cost", 1_000_000),
    is_demo: boolean(input.is_demo === undefined ? false : input.is_demo, "is_demo"),
  };
}
