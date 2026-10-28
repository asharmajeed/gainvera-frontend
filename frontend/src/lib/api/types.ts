/** API v2.0: companion backend domain.py/results.py, 28 October 2026.
 * Source revisions and SHA-256 values are recorded in docs/API_SOURCE.md. */
export type ApiRisk = "unknown" | "low" | "medium" | "high";
export type ApiDataAvailability = "unknown" | "digital" | "manual";
export type ApiTaskFamily =
  | "catalog_copy"
  | "support_reply"
  | "stock_alert"
  | "catalog_cleanup"
  | "order_report"
  | "refund_approval";
export type ApiRecommendation =
  | "AUTOMATE NOW"
  | "AI-ASSISTED"
  | "SIMPLIFY WITHOUT AI"
  | "LEAVE ALONE";
export type ApiAnalysisStatus = "not_analyzed" | "analyzed" | "needs_reanalysis";

export interface ApiWorkspaceCreate {
  name: string;
  currency?: "USD";
}
export interface ApiWorkspace extends Required<ApiWorkspaceCreate> {
  id: string;
  owner_id: string;
  created_at: string;
}
export interface ApiWorkflowCreate {
  workspace_id: string;
  name: string;
  description: string;
  hours_per_occurrence: number;
  occurrences_per_month: number;
  hourly_cost: number;
  current_tools?: string;
  pain_points?: string;
  risk?: ApiRisk;
  data_availability?: ApiDataAvailability;
  is_sample?: boolean;
}
export interface ApiWorkflow extends Required<ApiWorkflowCreate> {
  id: string;
  baseline_version: number;
  analysis_status: ApiAnalysisStatus;
  created_at: string;
  updated_at: string;
}
export type ApiWorkflowPatch = { baseline_version: number } &
  Partial<Omit<Required<ApiWorkflowCreate>, "workspace_id">>;
export interface ApiPage<T> {
  items: T[];
  next_cursor: string | null;
}
export interface ApiScenarioInput {
  baseline_version: number;
  reduction_percent: number;
  setup_hours: number;
  setup_fees: number;
  monthly_tool_fees: number;
  monthly_maintenance_hours: number;
}
export interface ApiScenario extends ApiScenarioInput {
  id: string;
  workflow_id: string;
  analysis_id: string;
  assumption_source: "user_scenario" | "illustrative_sample";
  updated_at: string;
}
export interface ApiROI {
  baseline_monthly_hours: number;
  gross_hours_saved: number;
  production_and_review_hours_after: number;
  total_hours_after: number;
  gross_capacity_value: number;
  recurring_cost: number;
  net_monthly_value: number;
  initial_investment: number;
  first_month_value: number;
  payback_months: number | null;
  net_hours_released: number;
}
export interface ApiMeasurementInput {
  baseline_version: number;
  period: string;
  production_and_review_hours_after: number;
  maintenance_hours_after: number;
  monthly_tools_and_fees: number;
  initial_implementation_cost: number;
  is_demo?: boolean;
}
export interface ApiMeasurement extends Required<ApiMeasurementInput> {
  id: string;
  workflow_id: string;
  created_at: string;
}
export interface ApiPriorityComponents {
  value: number;
  feasibility: number;
  readiness: number;
  safety: number;
}
export interface ApiAnalysis {
  rules_version: string;
  ml_reason: string | null;
  guidance_reason: string | null;
  safety_reasons: string[];
  id: string;
  workflow_id: string;
  baseline_version: number;
  task_family: ApiTaskFamily | null;
  recommendation: ApiRecommendation;
  priority_score: number;
  priority_components: ApiPriorityComponents;
  mode: "ai_assisted" | "reviewed_playbook_fallback" | "needs_clarification";
  ml_status: "recognized" | "abstained" | "unavailable";
  ml_confidence: number | null;
  model_version: string | null;
  playbook_id: string | null;
  playbook_version: string | null;
  provider_model: string | null;
  prompt_version: string | null;
  summary: string;
  steps: string[];
  human_review: string;
  risks: string[];
  missing_information: string[];
  created_at: string;
}
export interface ApiFieldIssue {
  field: string;
  code: string;
  message: string;
}
export interface ApiErrorDetail {
  code: string;
  message: string;
  request_id: string;
  details: ApiFieldIssue[];
  retryable: boolean;
}
export interface ApiErrorEnvelope {
  error: ApiErrorDetail;
}
export interface ApiHealth {
  status: "ok";
  service: "gainvera-api";
  version: string;
  dependencies: Record<
    "database" | "authentication" | "ml" | "ai",
    { status: "not_checked" | "not_implemented"; checked: false }
  >;
}

export interface ApiWorkflowBaseline {
  workflow_id: string;
  baseline_version: number;
  snapshot: ApiWorkflow;
  created_at: string;
}
export interface ApiReviewedPlaybook {
  id: string; version: string; task_family: ApiTaskFamily; title: string;
  conditions: string; base_recommendation: ApiRecommendation; difficulty: number;
  required_inputs: string[]; steps: string[]; example_template: string;
  human_review: string; risks: string[]; measurement_method: string;
  provenance: Record<string, unknown>; review_status: "reviewed";
  reviewed_by: string; reviewed_at: string; created_at: string;
}
export interface ApiAnalyzeInput {
  baseline_version: number;
  guidance_preference?: "auto" | "reviewed_playbook";
}
export interface ApiAnalysisState {
  state: "not_analyzed" | "ready" | "needs_clarification" | "needs_reanalysis";
  current_baseline_version: number;
  analysis: ApiAnalysis | null;
  playbook: ApiReviewedPlaybook | null;
}
export interface ApiScenarioSaveInput extends ApiScenarioInput {
  analysis_id: string;
  /** Required, exact saved string. Null applies to the first save PER ANALYSIS. */
  expected_updated_at: string | null;
}
export interface ApiScenarioState {
  state: "not_set" | "ready" | "historical" | "needs_reanalysis";
  current_baseline_version: number;
  scenario: ApiScenario | null;
  roi: ApiROI | null;
  priority_score: number | null;
}
export interface ApiMeasurementResult {
  measurement: ApiMeasurement;
  original_baseline: ApiWorkflowBaseline;
  net_hours_released: number;
  net_monthly_value: number;
  first_month_value: number;
  provenance: "hypothetical" | "self_reported";
}
export interface ApiDashboardRow {
  workflow: ApiWorkflow;
  analysis_state: ApiAnalysisState;
  scenario_state: ApiScenarioState;
}
export interface ApiCoverage {
  ready: number; not_analyzed: number; needs_clarification: number; needs_reanalysis: number;
  total_workflows: number; current_scenarios: number; measurement_records: number;
}
export interface ApiScenarioTotals {
  baseline_monthly_hours: number | null; gross_hours_saved: number | null;
  net_hours_released: number | null; net_monthly_value: number | null;
  initial_investment: number | null; first_month_value: number | null;
  covered_workflows: number; all_workflow_monthly_hours: number;
}
export interface ApiDashboard {
  workspace: ApiWorkspace;
  generated_at: string;
  coverage: ApiCoverage;
  scenario_totals: ApiScenarioTotals;
  ranked_workflows: ApiDashboardRow[];
  measurements: ApiMeasurementResult[];
  notes: string[];
}
export interface ApiReportDownload { blob: Blob; filename: string }
