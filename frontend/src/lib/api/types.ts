/** API v1.1 persistence types; analysis/results endpoints are still planned. */
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

// Dashboard remains undefined; do not invent its response shape.
// Scenario PUT's result envelope is also only proposed, so no endpoint binding yet.
