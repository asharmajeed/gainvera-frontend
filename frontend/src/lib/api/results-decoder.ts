import type { ApiAnalysisState, ApiDashboard, ApiMeasurement, ApiPage, ApiScenarioState, ApiWorkflowBaseline } from "./types";

// Validate result framing and the fields displayed/used for concurrency. Return the
// original objects: nulls, precision, unknown provenance JSON and negatives survive.
type ObjectValue = Record<string, unknown>;
const obj = (value: unknown): value is ObjectValue => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const positive = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0;
const count = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
const text = (value: unknown): value is string => typeof value === "string";
const texts = (value: unknown) => Array.isArray(value) && value.every(text);
const nullableText = (value: unknown) => value === null || text(value);
const nullableNumber = (value: unknown) => value === null || finite(value);
const inSet = (value: unknown, values: string[]) => typeof value === "string" && values.includes(value);
const timestamp = (value: unknown) => text(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
const uuid = (value: unknown) => text(value) && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);
const families = ["catalog_copy", "support_reply", "stock_alert", "catalog_cleanup", "order_report", "refund_approval"];
const actions = ["AUTOMATE NOW", "AI-ASSISTED", "SIMPLIFY WITHOUT AI", "LEAVE ALONE"];
const assert = (condition: unknown) => { if (!condition) throw new Error("Invalid result contract."); };
function workflow(value: unknown) {
  assert(obj(value)); const v = value as ObjectValue;
  assert(uuid(v.id) && uuid(v.workspace_id) && positive(v.baseline_version));
  assert(["name", "description", "current_tools", "pain_points"].every((key) => text(v[key])));
  assert(["hours_per_occurrence", "occurrences_per_month", "hourly_cost"].every((key) => finite(v[key]) && Number(v[key]) >= 0));
  assert(inSet(v.risk, ["unknown", "low", "medium", "high"]) && inSet(v.data_availability, ["unknown", "digital", "manual"]));
  assert(inSet(v.analysis_status, ["not_analyzed", "analyzed", "needs_reanalysis"]) && typeof v.is_sample === "boolean" && timestamp(v.created_at) && timestamp(v.updated_at));
}
function analysis(value: unknown) {
  assert(obj(value)); const v = value as ObjectValue;
  assert(uuid(v.id) && uuid(v.workflow_id) && positive(v.baseline_version) && (v.task_family === null || inSet(v.task_family, families)));
  assert(inSet(v.recommendation, actions) && count(v.priority_score) && Number(v.priority_score) <= 100);
  assert(obj(v.priority_components) && ["value", "feasibility", "readiness", "safety"].every((key) => finite((v.priority_components as ObjectValue)[key])));
  assert(inSet(v.mode, ["ai_assisted", "reviewed_playbook_fallback", "needs_clarification"]) && inSet(v.ml_status, ["recognized", "abstained", "unavailable"]));
  assert(v.ml_confidence === null || (finite(v.ml_confidence) && v.ml_confidence >= 0 && v.ml_confidence <= 1));
  assert(["model_version", "playbook_id", "playbook_version", "provider_model", "prompt_version", "ml_reason", "guidance_reason"].every((key) => nullableText(v[key])));
  assert(["summary", "human_review", "rules_version"].every((key) => text(v[key])) && timestamp(v.created_at));
  assert(["steps", "risks", "missing_information", "safety_reasons"].every((key) => texts(v[key])));
}
function playbook(value: unknown) {
  assert(obj(value)); const v = value as ObjectValue;
  assert(["id", "version", "title", "conditions", "example_template", "human_review", "measurement_method", "reviewed_by"].every((key) => text(v[key])));
  assert(inSet(v.task_family, families) && inSet(v.base_recommendation, actions) && count(v.difficulty) && Number(v.difficulty) <= 100);
  assert(["required_inputs", "steps", "risks"].every((key) => texts(v[key])) && obj(v.provenance) && v.review_status === "reviewed" && timestamp(v.reviewed_at) && timestamp(v.created_at));
}
function baseline(value: unknown) {
  assert(obj(value)); const v = value as ObjectValue;
  assert(uuid(v.workflow_id) && positive(v.baseline_version) && timestamp(v.created_at)); workflow(v.snapshot);
  assert((v.snapshot as ObjectValue).id === v.workflow_id && (v.snapshot as ObjectValue).baseline_version === v.baseline_version);
}
function measurement(value: unknown) {
  assert(obj(value)); const v = value as ObjectValue;
  assert(uuid(v.id) && uuid(v.workflow_id) && positive(v.baseline_version) && timestamp(v.created_at));
  assert(text(v.period) && /^\d{4}-(0[1-9]|1[0-2])$/.test(v.period) && typeof v.is_demo === "boolean");
  assert(["production_and_review_hours_after", "maintenance_hours_after", "monthly_tools_and_fees", "initial_implementation_cost"].every((key) => finite(v[key]) && Number(v[key]) >= 0));
}
export function decodeAnalysisState(value: unknown): ApiAnalysisState {
  assert(obj(value)); const v = value as ObjectValue;
  assert(inSet(v.state, ["not_analyzed", "ready", "needs_clarification", "needs_reanalysis"]) && positive(v.current_baseline_version));
  assert(v.analysis === null || obj(v.analysis)); assert(v.playbook === null || obj(v.playbook));
  if (v.analysis !== null) analysis(v.analysis);
  if (v.playbook !== null) playbook(v.playbook);
  assert(v.state === "not_analyzed" ? v.analysis === null : v.analysis !== null);
  return value as ApiAnalysisState;
}
export function decodeScenarioState(value: unknown): ApiScenarioState {
  assert(obj(value)); const v = value as ObjectValue;
  assert(inSet(v.state, ["not_set", "ready", "historical", "needs_reanalysis"]) && positive(v.current_baseline_version));
  assert(v.scenario === null || obj(v.scenario)); assert(v.roi === null || obj(v.roi));
  assert(v.priority_score === null || (count(v.priority_score) && Number(v.priority_score) <= 100));
  if (v.scenario !== null) {
    const s = v.scenario as ObjectValue;
    assert(uuid(s.id) && uuid(s.workflow_id) && uuid(s.analysis_id) && positive(s.baseline_version) && timestamp(s.updated_at));
    assert(["reduction_percent", "setup_hours", "setup_fees", "monthly_tool_fees", "monthly_maintenance_hours"].every((key) => finite(s[key])) && inSet(s.assumption_source, ["user_scenario", "illustrative_sample"]));
  }
  if (v.roi !== null) {
    const roi = v.roi as ObjectValue;
    assert(["baseline_monthly_hours", "gross_hours_saved", "production_and_review_hours_after", "total_hours_after", "gross_capacity_value", "recurring_cost", "net_monthly_value", "initial_investment", "first_month_value", "net_hours_released"].every((key) => finite(roi[key])) && nullableNumber(roi.payback_months));
  }
  if (v.state === "not_set") assert(v.scenario === null && v.roi === null && v.priority_score === null);
  if (v.state === "ready" || v.state === "historical") assert(v.scenario !== null && v.roi !== null && v.priority_score !== null);
  return value as ApiScenarioState;
}
function page<T>(value: unknown, validate: (item: unknown) => void): ApiPage<T> {
  assert(obj(value)); const v = value as ObjectValue;
  assert(Array.isArray(v.items) && (v.next_cursor === null || (text(v.next_cursor) && v.next_cursor.length <= 1024)));
  (v.items as unknown[]).forEach(validate); return value as ApiPage<T>;
}
export const decodeBaselines = (value: unknown) => page<ApiWorkflowBaseline>(value, baseline);
export const decodeMeasurements = (value: unknown) => page<ApiMeasurement>(value, measurement);
export function decodeMeasurement(value: unknown): ApiMeasurement { measurement(value); return value as ApiMeasurement; }
export function decodeDashboard(value: unknown): ApiDashboard {
  assert(obj(value)); const v = value as ObjectValue;
  assert(obj(v.workspace) && uuid(v.workspace.id) && text(v.workspace.name) && v.workspace.currency === "USD" && timestamp(v.generated_at));
  const workspace = v.workspace as ObjectValue;
  assert(obj(v.coverage) && ["ready", "not_analyzed", "needs_clarification", "needs_reanalysis", "total_workflows", "current_scenarios", "measurement_records"].every((key) => count((v.coverage as ObjectValue)[key])));
  assert(obj(v.scenario_totals)); const totals = v.scenario_totals as ObjectValue;
  assert(["baseline_monthly_hours", "gross_hours_saved", "net_hours_released", "net_monthly_value", "initial_investment", "first_month_value"].every((key) => nullableNumber(totals[key])) && count(totals.covered_workflows) && finite(totals.all_workflow_monthly_hours));
  assert(Array.isArray(v.ranked_workflows));
  for (const row of v.ranked_workflows as unknown[]) {
    assert(obj(row)); const r = row as ObjectValue; workflow(r.workflow); decodeAnalysisState(r.analysis_state); decodeScenarioState(r.scenario_state);
    assert((r.workflow as ObjectValue).workspace_id === workspace.id);
  }
  assert(Array.isArray(v.measurements));
  for (const row of v.measurements as unknown[]) {
    assert(obj(row)); const r = row as ObjectValue; measurement(r.measurement); baseline(r.original_baseline);
    assert(["net_hours_released", "net_monthly_value", "first_month_value"].every((key) => finite(r[key])) && inSet(r.provenance, ["hypothetical", "self_reported"]));
    const m = r.measurement as ObjectValue, b = r.original_baseline as ObjectValue;
    assert(m.workflow_id === b.workflow_id && m.baseline_version === b.baseline_version && (b.snapshot as ObjectValue).workspace_id === workspace.id);
  }
  assert(texts(v.notes)); return value as ApiDashboard;
}
