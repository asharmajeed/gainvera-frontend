import test from "node:test";
import assert from "node:assert/strict";
import {
  analysisFromApi,
  ApiInputError,
  createDevelopmentFixtureSource,
  measurementFromApi,
  measurementToInput,
  scenarioFromApi,
  scenarioToInput,
  workflowFromApi,
  workflowToCreateRequest,
  workspaceCreateBody,
} from "../src/lib/api";
import type { ApiAnalysis, ApiMeasurement, ApiScenario } from "../src/lib/api";
import { exampleWorkflows } from "../src/lib/fixtures";

const source = createDevelopmentFixtureSource({ mode: "development_fixture" });
const snapshot = source.getSnapshot();
const workspaceId = snapshot.workspace.id;
const assumptions = { reduction: 40, setupHours: 2, setupCost: 0, monthlyTools: 10, maintenanceHours: 0.5 };

test("workflow conversion whitelists create fields and uses an explicit workspace", () => {
  const legacy = { ...exampleWorkflows[0], baseline_version: 7, owner_id: "do-not-send", priority_score: 99 };
  const before = structuredClone(legacy);
  const body = workflowToCreateRequest(legacy, workspaceId);
  assert.deepEqual(Object.keys(body).sort(), [
    "workspace_id", "name", "description", "hours_per_occurrence", "occurrences_per_month",
    "hourly_cost", "current_tools", "pain_points", "risk", "data_availability", "is_sample",
  ].sort());
  assert.equal(body.workspace_id, workspaceId);
  assert.equal(body.hours_per_occurrence, legacy.hours);
  assert.equal(body.occurrences_per_month, legacy.frequency);
  assert.equal(body.hourly_cost, legacy.hourlyCost);
  assert.equal(body.is_sample, true);
  assert.deepEqual(legacy, before);
  assert.deepEqual(workspaceCreateBody(snapshot.workspace), { name: snapshot.workspace.name, currency: "USD" });
});

test("omitted readiness facts stay unknown and decimal/zero inputs are not rounded", () => {
  const body = workflowToCreateRequest({
    name: " New workflow ", description: " A sufficiently detailed task. ",
    hours: 0.125, frequency: 0.5, hourlyCost: 0,
  }, workspaceId);
  assert.equal(body.risk, "unknown");
  assert.equal(body.data_availability, "unknown");
  assert.equal(body.hours_per_occurrence, 0.125);
  assert.equal(body.occurrences_per_month, 0.5);
  assert.equal(body.hourly_cost, 0);
  assert.equal(body.name, "New workflow");
  assert.equal(body.is_sample, false);
  assert.equal(workspaceCreateBody({ name: "\u{1f600}".repeat(100) }).name, "\u{1f600}".repeat(100));
});

test("workflow views retain all analysis statuses, baseline version and timestamps", () => {
  for (const status of ["not_analyzed", "analyzed", "needs_reanalysis"] as const) {
    const record = { ...snapshot.workflows[0], analysis_status: status, baseline_version: 4 };
    const view = workflowFromApi(record);
    assert.equal(view.analysisStatus, status);
    assert.equal(view.baselineVersion, 4);
    assert.equal(view.workspaceId, workspaceId);
    assert.equal(view.createdAt, record.created_at);
    assert.equal(view.updatedAt, record.updated_at);
    assert.equal(view.risk, "unknown");
    assert.equal(view.data, "unknown");
    assert.equal("analyzed" in view, false);
    assert.deepEqual(workflowToCreateRequest(view, view.workspaceId), workflowToCreateRequest({
      name: record.name, description: record.description, hours: record.hours_per_occurrence,
      frequency: record.occurrences_per_month, hourlyCost: record.hourly_cost,
      tools: record.current_tools, painPoints: record.pain_points, risk: record.risk,
      data: record.data_availability, sample: record.is_sample,
    }, workspaceId));
  }
});

test("analysis views keep unavailable provenance null and zero confidence distinct from priority", () => {
  const unavailable = snapshot.analyses[0];
  const view = analysisFromApi(unavailable);
  assert.equal(view.taskFamily, null);
  for (const key of ["mlConfidence", "modelVersion", "playbookId", "playbookVersion", "providerModel", "promptVersion"] as const)
    assert.equal(view[key], null);
  assert.equal(view.mode, "needs_clarification");
  assert.equal(view.mlStatus, "unavailable");
  assert.equal("similarity" in view, false);
  const abstained: ApiAnalysis = { ...unavailable, ml_status: "abstained", ml_confidence: 0, model_version: "synthetic-test-version", priority_score: 17 };
  const abstainedView = analysisFromApi(abstained);
  assert.equal(abstainedView.mlConfidence, 0);
  assert.equal(abstainedView.priorityScore, 17);
  assert.equal(abstainedView.modelVersion, "synthetic-test-version");
  view.steps.push("changed by consumer");
  assert.deepEqual(unavailable.steps, []);
});

test("scenario mapping retains version, fees-only setup cost and assumption source", () => {
  const body = scenarioToInput(assumptions, 3);
  assert.deepEqual(body, {
    baseline_version: 3, reduction_percent: 40, setup_hours: 2, setup_fees: 0,
    monthly_tool_fees: 10, monthly_maintenance_hours: 0.5,
  });
  const record: ApiScenario = {
    ...body, id: "scenario-fixture", workflow_id: snapshot.workflows[0].id,
    analysis_id: snapshot.analyses[0].id, assumption_source: "illustrative_sample",
    updated_at: "2026-10-20T00:00:00Z",
  };
  const view = scenarioFromApi(record);
  assert.deepEqual(view.assumptions, assumptions);
  assert.equal(view.baselineVersion, 3);
  assert.equal(view.assumptionSource, "illustrative_sample");
  assert.equal(view.analysisId, record.analysis_id);
});

test("measurements preserve split hours/costs, historical baseline and false demo flag", () => {
  const draft = {
    period: "2026-10", productionAndReviewHoursAfter: 6.5, maintenanceHoursAfter: 0.5,
    monthlyToolsAndFees: 10, initialImplementationCost: 40, isDemo: false,
  };
  const body = measurementToInput(draft, 2);
  const record: ApiMeasurement = {
    ...body, id: "measurement-fixture", workflow_id: snapshot.workflows[0].id,
    created_at: "2026-10-20T00:00:00Z",
  };
  assert.equal(body.production_and_review_hours_after, 6.5);
  assert.equal(body.maintenance_hours_after, 0.5);
  assert.equal(body.monthly_tools_and_fees, 10);
  assert.equal(body.initial_implementation_cost, 40);
  const view = measurementFromApi(record);
  assert.deepEqual(measurementToInput(view, view.baselineVersion), body);
  assert.equal(view.baselineVersion, 2);
  assert.equal(view.isDemo, false);
  assert.equal(view.createdAt, record.created_at);
});

test("legacy combined outcomes require explicit re-entry instead of guessed splits", () => {
  const legacyOutcome = { hours: 7, monthlyCost: 20, implementationCost: 40, period: "2026-10", demo: true };
  // @ts-expect-error The old Outcome is intentionally not a MeasurementDraft.
  assert.throws(() => measurementToInput(legacyOutcome, 1), ApiInputError);
});

test("invalid numbers, risk, booleans, versions and calendar months cannot become requests", () => {
  for (const hours of [NaN, Infinity, -1, 745, "2", true])
    assert.throws(() => workflowToCreateRequest({ ...exampleWorkflows[0], hours } as never, workspaceId), ApiInputError);
  assert.throws(() => workflowToCreateRequest({ ...exampleWorkflows[0], risk: null } as never, workspaceId), ApiInputError);
  assert.throws(() => workflowToCreateRequest({ ...exampleWorkflows[0], sample: "false" } as never, workspaceId), ApiInputError);
  assert.throws(() => scenarioToInput({ ...assumptions, reduction: NaN }, 1), ApiInputError);
  for (const version of [0, -1, 1.5, Infinity])
    assert.throws(() => scenarioToInput(assumptions, version), ApiInputError);
  for (const period of ["2026-00", "2026-13", "2026-1", "October"])
    assert.throws(() => measurementToInput({
      period, productionAndReviewHoursAfter: 0, maintenanceHoursAfter: 0,
      monthlyToolsAndFees: 0, initialImplementationCost: 0,
    }, 1), ApiInputError);
});
