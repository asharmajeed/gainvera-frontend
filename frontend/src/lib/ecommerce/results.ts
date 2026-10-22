import { ApiInputError, measurementInputBody, scenarioInputBody } from "../api";
import type { ApiMeasurement, ApiMeasurementInput, ApiROI, ApiScenarioInput, ApiWorkflow } from "../api";
import { baselineForMeasurement, PreviewStateError } from "./preview";
import type { PreviewState } from "./preview";

/** Local UI state, not a proposed API envelope or a saved backend Scenario. */
export interface LocalScenario {
  workflowId: string;
  baselineVersion: number;
  input: ApiScenarioInput;
  assumptionSource: "user_scenario" | "illustrative_sample";
}

/** Contract arithmetic only. No reduction defaults, priority or recommendation rules. */
export function calculateLocalROI(workflow: ApiWorkflow, input: ApiScenarioInput): ApiROI {
  const scenario = scenarioInputBody(input);
  if (scenario.baseline_version !== workflow.baseline_version)
    throw new PreviewStateError("stale_version", "Select the matching baseline before calculating this scenario.");
  const baseline = workflow.hours_per_occurrence * workflow.occurrences_per_month;
  const saved = baseline * scenario.reduction_percent / 100;
  const production = baseline - saved;
  const recurring = scenario.monthly_tool_fees + scenario.monthly_maintenance_hours * workflow.hourly_cost;
  const gross = saved * workflow.hourly_cost;
  const net = gross - recurring;
  const initial = scenario.setup_fees + scenario.setup_hours * workflow.hourly_cost;
  return {
    baseline_monthly_hours: baseline, gross_hours_saved: saved,
    production_and_review_hours_after: production,
    total_hours_after: production + scenario.monthly_maintenance_hours,
    gross_capacity_value: gross, recurring_cost: recurring, net_monthly_value: net,
    initial_investment: initial, first_month_value: net - initial,
    payback_months: net > 0 ? initial / net : null,
    net_hours_released: saved - scenario.monthly_maintenance_hours,
  };
}

export function currentLocalScenario(state: PreviewState, workflow: ApiWorkflow) {
  return state.scenarioPreviews.find((item) => item.workflowId === workflow.id && item.baselineVersion === workflow.baseline_version) ?? null;
}

export function saveLocalScenario(state: PreviewState, workflowId: string, input: ApiScenarioInput,
  assumptionSource: LocalScenario["assumptionSource"]): PreviewState {
  const workflow = state.workflows.find((item) => item.id === workflowId && item.workspace_id === state.selectedWorkspaceId);
  if (!workflow) throw new PreviewStateError("workflow_missing", "Select this workflow's workspace before saving.");
  const normalized = scenarioInputBody(input);
  calculateLocalROI(workflow, normalized);
  return { ...state, scenarioPreviews: [
    ...state.scenarioPreviews.filter((item) => item.workflowId !== workflowId || item.baselineVersion !== normalized.baseline_version),
    { workflowId, baselineVersion: normalized.baseline_version, input: normalized, assumptionSource },
  ] };
}

export function addLocalMeasurement(state: PreviewState, workflowId: string, input: ApiMeasurementInput): PreviewState {
  if (!state.workflows.some((item) => item.id === workflowId && item.workspace_id === state.selectedWorkspaceId))
    throw new PreviewStateError("workflow_missing", "Select this workflow's workspace before recording a measurement.");
  const normalized = measurementInputBody(input);
  if (!state.baselines.some((item) => item.id === workflowId && item.baseline_version === normalized.baseline_version))
    throw new ApiInputError("baseline_version", "The selected historical baseline is unavailable. No comparison was saved.");
  const record: ApiMeasurement = {
    ...normalized, id: crypto.randomUUID(), workflow_id: workflowId, created_at: new Date().toISOString(),
  };
  return { ...state, measurements: [...state.measurements, record] };
}

export function compareLocalMeasurement(state: PreviewState, measurement: ApiMeasurement) {
  const original = baselineForMeasurement(state, measurement);
  if (!original) return null;
  const baseline = original.hours_per_occurrence * original.occurrences_per_month;
  const totalHoursAfter = measurement.production_and_review_hours_after + measurement.maintenance_hours_after;
  const hoursReleased = baseline - totalHoursAfter;
  const netValue = hoursReleased * original.hourly_cost - measurement.monthly_tools_and_fees;
  const scenario = state.scenarioPreviews.find((item) => item.workflowId === measurement.workflow_id && item.baselineVersion === measurement.baseline_version);
  const projected = scenario ? calculateLocalROI(original, scenario.input) : null;
  return {
    baselineHours: baseline, originalHourlyCost: original.hourly_cost, totalHoursAfter,
    netHoursReleased: hoursReleased, netMonthlyValue: netValue,
    firstMonthValue: netValue - measurement.initial_implementation_cost,
    paybackMonths: netValue > 0 ? measurement.initial_implementation_cost / netValue : null,
    scenarioHoursAfter: projected?.total_hours_after ?? null,
    hoursVariance: projected ? projected.total_hours_after - totalHoursAfter : null,
  };
}

/** Presentation derived from agreed record fields, never an API Dashboard contract. */
export function previewDashboard(state: PreviewState) {
  const workflows = state.workflows.filter((item) => item.workspace_id === state.selectedWorkspaceId);
  const rows = workflows.map((workflow) => {
    const scenario = currentLocalScenario(state, workflow);
    const roi = scenario ? calculateLocalROI(workflow, scenario.input) : null;
    const measurements = state.measurements.filter((item) => item.workflow_id === workflow.id);
    return { workflow, scenario, roi, measurements };
  });
  const scenarioRows = rows.filter((row) => row.roi !== null);
  return {
    rows, workflowCount: rows.length, scenarioCount: scenarioRows.length,
    measurementCount: rows.reduce((total, row) => total + row.measurements.length, 0),
    baselineHours: workflows.reduce((total, item) => total + item.hours_per_occurrence * item.occurrences_per_month, 0),
    // An absent scenario stays absent, not zero savings. No mixed-period measurement totals.
    localScenarioNetValue: scenarioRows.length ? scenarioRows.reduce((total, row) => total + row.roi!.net_monthly_value, 0) : null,
  };
}
