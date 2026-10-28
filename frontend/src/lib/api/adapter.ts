import type { Assumptions, Workflow } from "../models";
import type {
  ApiAnalysis,
  ApiAnalysisState,
  ApiAnalysisStatus,
  ApiMeasurement,
  ApiScenario,
  ApiScenarioState,
  ApiWorkflow,
} from "./types";
import { measurementInputBody, scenarioInputBody, workflowCreateBody, workflowPatchBody } from "./validation";

/** Accepts existing form fields, but never automatically reads browser storage. */
export type WorkflowDraft = Pick<
  Workflow,
  "name" | "description" | "hours" | "frequency" | "hourlyCost"
> & Partial<Pick<Workflow, "tools" | "painPoints" | "risk" | "data" | "sample">>;

export interface WorkflowView extends Required<WorkflowDraft> {
  id: string;
  workspaceId: string;
  baselineVersion: number;
  analysisStatus: ApiAnalysisStatus;
  createdAt: string;
  updatedAt: string;
}

export function workflowToCreateRequest(draft: WorkflowDraft, workspaceId: string) {
  return workflowCreateBody({
    workspace_id: workspaceId,
    name: draft.name,
    description: draft.description,
    hours_per_occurrence: draft.hours,
    occurrences_per_month: draft.frequency,
    hourly_cost: draft.hourlyCost,
    current_tools: draft.tools,
    pain_points: draft.painPoints,
    risk: draft.risk,
    data_availability: draft.data,
    is_sample: draft.sample,
  });
}

/** Returns null for identical inputs instead of submitting an empty PATCH. */
export function workflowToPatchRequest(draft: WorkflowDraft, current: ApiWorkflow) {
  const body = workflowToCreateRequest(draft, current.workspace_id);
  const changes = Object.fromEntries(Object.entries(body).filter(([key, value]) =>
    key !== "workspace_id" && current[key as keyof ApiWorkflow] !== value));
  if (!Object.keys(changes).length) return null;
  return workflowPatchBody({ baseline_version: current.baseline_version, ...changes });
}

/** A new view, not a legacy Workflow: retains version/status instead of a boolean. */
export function workflowFromApi(record: ApiWorkflow): WorkflowView {
  return {
    id: record.id,
    workspaceId: record.workspace_id,
    name: record.name,
    description: record.description,
    hours: record.hours_per_occurrence,
    frequency: record.occurrences_per_month,
    hourlyCost: record.hourly_cost,
    tools: record.current_tools,
    painPoints: record.pain_points,
    risk: record.risk,
    data: record.data_availability,
    sample: record.is_sample,
    baselineVersion: record.baseline_version,
    analysisStatus: record.analysis_status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export function scenarioToInput(assumptions: Assumptions, baselineVersion: number) {
  return scenarioInputBody({
    baseline_version: baselineVersion,
    reduction_percent: assumptions.reduction,
    setup_hours: assumptions.setupHours,
    setup_fees: assumptions.setupCost,
    monthly_tool_fees: assumptions.monthlyTools,
    monthly_maintenance_hours: assumptions.maintenanceHours,
  });
}

export function scenarioFromApi(record: ApiScenario) {
  return {
    id: record.id,
    workflowId: record.workflow_id,
    analysisId: record.analysis_id,
    baselineVersion: record.baseline_version,
    assumptionSource: record.assumption_source,
    updatedAt: record.updated_at,
    assumptions: {
      reduction: record.reduction_percent,
      setupHours: record.setup_hours,
      setupCost: record.setup_fees,
      monthlyTools: record.monthly_tool_fees,
      maintenanceHours: record.monthly_maintenance_hours,
    } satisfies Assumptions,
  };
}

/** Deliberately incompatible with legacy Outcome's combined hours/monthlyCost. */
export interface MeasurementDraft {
  period: string;
  productionAndReviewHoursAfter: number;
  maintenanceHoursAfter: number;
  monthlyToolsAndFees: number;
  initialImplementationCost: number;
  isDemo?: boolean;
}

export function measurementToInput(draft: MeasurementDraft, baselineVersion: number) {
  return measurementInputBody({
    baseline_version: baselineVersion,
    period: draft.period,
    production_and_review_hours_after: draft.productionAndReviewHoursAfter,
    maintenance_hours_after: draft.maintenanceHoursAfter,
    monthly_tools_and_fees: draft.monthlyToolsAndFees,
    initial_implementation_cost: draft.initialImplementationCost,
    is_demo: draft.isDemo,
  });
}

export function measurementFromApi(record: ApiMeasurement) {
  return {
    id: record.id,
    workflowId: record.workflow_id,
    baselineVersion: record.baseline_version,
    period: record.period,
    productionAndReviewHoursAfter: record.production_and_review_hours_after,
    maintenanceHoursAfter: record.maintenance_hours_after,
    monthlyToolsAndFees: record.monthly_tools_and_fees,
    initialImplementationCost: record.initial_implementation_cost,
    isDemo: record.is_demo,
    createdAt: record.created_at,
  };
}

/** Never maps legacy text similarity to ML confidence or invents provenance. */
export function analysisFromApi(record: ApiAnalysis) {
  return {
    rulesVersion: record.rules_version,
    mlReason: record.ml_reason,
    guidanceReason: record.guidance_reason,
    safetyReasons: [...record.safety_reasons],
    id: record.id,
    workflowId: record.workflow_id,
    baselineVersion: record.baseline_version,
    taskFamily: record.task_family,
    recommendation: record.recommendation,
    priorityScore: record.priority_score,
    priorityComponents: { ...record.priority_components },
    mode: record.mode,
    mlStatus: record.ml_status,
    mlConfidence: record.ml_confidence,
    modelVersion: record.model_version,
    playbookId: record.playbook_id,
    playbookVersion: record.playbook_version,
    providerModel: record.provider_model,
    promptVersion: record.prompt_version,
    summary: record.summary,
    steps: [...record.steps],
    humanReview: record.human_review,
    risks: [...record.risks],
    missingInformation: [...record.missing_information],
    createdAt: record.created_at,
  };
}

/** No Date conversion: PostgreSQL's timestamp precision is the concurrency token. */
export function scenarioEditContext(analysis: ApiAnalysisState, saved: ApiScenarioState) {
  if (analysis.state !== "ready" || !analysis.analysis) return null;
  const current = saved.state === "ready" && saved.scenario?.analysis_id === analysis.analysis.id &&
    saved.scenario.baseline_version === analysis.current_baseline_version;
  return { baseline_version: analysis.current_baseline_version, analysis_id: analysis.analysis.id,
    expected_updated_at: current ? saved.scenario!.updated_at : null };
}
