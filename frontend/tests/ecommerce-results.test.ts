import test from "node:test";
import assert from "node:assert/strict";
import { ApiClientError, ApiInputError, workflowFromApi } from "../src/lib/api";
import type { ApiScenarioInput } from "../src/lib/api";
import { addPreviewWorkspace, createPreviewState, deletePreviewWorkflow, editPreviewWorkflow, PreviewStateError } from "../src/lib/ecommerce/preview";
import { addLocalMeasurement, calculateLocalROI, compareLocalMeasurement, currentLocalScenario, previewDashboard, saveLocalScenario } from "../src/lib/ecommerce/results";
import { analysisExample, failureExample, presentFailure } from "../src/lib/ecommerce/response-examples";
import { createFixtureReportHtml, escapeReportText } from "../src/lib/ecommerce/report";

const scenario: ApiScenarioInput = {
  baseline_version: 1, reduction_percent: 40, setup_hours: 2, setup_fees: 0,
  monthly_tool_fees: 10, monthly_maintenance_hours: 0.5,
};
const measurement = {
  baseline_version: 1, period: "2026-10", production_and_review_hours_after: 6.5,
  maintenance_hours_after: 0.5, monthly_tools_and_fees: 10, initial_implementation_cost: 40, is_demo: true,
};

test("local ROI matches the contract example without rounding or changing priority", () => {
  const state = createPreviewState();
  const workflow = state.workflows[0];
  assert.deepEqual(calculateLocalROI(workflow, scenario), {
    baseline_monthly_hours: 10, gross_hours_saved: 4, production_and_review_hours_after: 6,
    total_hours_after: 6.5, gross_capacity_value: 80, recurring_cost: 20, net_monthly_value: 60,
    initial_investment: 40, first_month_value: 20, payback_months: 40 / 60, net_hours_released: 3.5,
  });
  const saved = saveLocalScenario(state, workflow.id, scenario, "illustrative_sample");
  assert.deepEqual(saved.workflows, state.workflows);
  assert.deepEqual(saved.analyses, []);
  assert.deepEqual(saved.scenarios, [], "a local scenario is never a forged backend Scenario");
  assert.equal(currentLocalScenario(saved, workflow)?.assumptionSource, "illustrative_sample");
});

test("local ROI retains negative time/value and null payback at nonpositive net value", () => {
  const workflow = createPreviewState().workflows[0];
  const negative = calculateLocalROI(workflow, { ...scenario, reduction_percent: 0 });
  assert.equal(negative.net_monthly_value, -20);
  assert.equal(negative.first_month_value, -60);
  assert.equal(negative.net_hours_released, -0.5);
  assert.equal(negative.payback_months, null);
  const zero = calculateLocalROI({ ...workflow, hourly_cost: 0 }, { ...scenario, monthly_tool_fees: 0 });
  assert.equal(zero.net_monthly_value, 0);
  assert.equal(zero.payback_months, null);
  assert.throws(() => calculateLocalROI(workflow, { ...scenario, reduction_percent: NaN }), ApiInputError);
  assert.throws(() => calculateLocalROI(workflow, { ...scenario, baseline_version: 2 }), PreviewStateError);
});

test("measurement arithmetic splits upkeep and fees exactly once and compares total hours", () => {
  const initial = createPreviewState();
  const workflow = initial.workflows[0];
  const state = addLocalMeasurement(saveLocalScenario(initial, workflow.id, scenario, "user_scenario"), workflow.id, measurement);
  assert.deepEqual(compareLocalMeasurement(state, state.measurements[0]), {
    baselineHours: 10, originalHourlyCost: 20, totalHoursAfter: 7,
    netHoursReleased: 3, netMonthlyValue: 50, firstMonthValue: 10,
    paybackMonths: 0.8, scenarioHoursAfter: 6.5, hoursVariance: -0.5,
  });
  const overrun = addLocalMeasurement(state, workflow.id, { ...measurement, production_and_review_hours_after: 12, is_demo: false });
  const result = compareLocalMeasurement(overrun, overrun.measurements[1])!;
  assert.equal(result.netHoursReleased, -2.5);
  assert.equal(result.netMonthlyValue, -60);
  assert.equal(result.firstMonthValue, -100);
  assert.equal(result.paybackMonths, null);
  assert.equal(overrun.measurements[1].is_demo, false);
});

test("edits invalidate current scenarios while measurements still use original baseline and matching scenario", () => {
  const initial = createPreviewState();
  const workflow = initial.workflows[0];
  const saved = addLocalMeasurement(saveLocalScenario(initial, workflow.id, scenario, "user_scenario"), workflow.id, measurement);
  const edited = editPreviewWorkflow(saved, workflow.id, 1, { ...workflowFromApi(workflow), hours: 2, hourlyCost: 99 });
  assert.equal(currentLocalScenario(edited, edited.workflows[0]), null);
  assert.equal(previewDashboard(edited).localScenarioNetValue, null);
  assert.equal(compareLocalMeasurement(edited, edited.measurements[0])?.originalHourlyCost, 20);
  assert.equal(compareLocalMeasurement(edited, edited.measurements[0])?.netMonthlyValue, 50);
  assert.equal(compareLocalMeasurement(edited, edited.measurements[0])?.scenarioHoursAfter, 6.5);
  const historical = addLocalMeasurement(edited, workflow.id, { ...measurement, period: "2026-11" });
  assert.equal(historical.measurements[1].baseline_version, 1, "explicit historical entry stays historical");
  assert.throws(() => saveLocalScenario(edited, workflow.id, scenario, "user_scenario"), PreviewStateError);
  const deleted = deletePreviewWorkflow(edited, workflow.id);
  assert.equal(deleted.scenarioPreviews.length, 0);
  assert.equal(deleted.measurements.length, 0);
});

test("unknown baselines, invalid months/versions and cross-workspace submissions are rejected", () => {
  const state = createPreviewState();
  const workflow = state.workflows[0];
  for (const input of [{ ...measurement, baseline_version: 99 }, { ...measurement, baseline_version: 0 }, { ...measurement, period: "2026-13" }, { ...measurement, maintenance_hours_after: NaN }])
    assert.throws(() => addLocalMeasurement(state, workflow.id, input), ApiInputError);
  const missing = { ...state, baselines: [] };
  const withMeasurement = addLocalMeasurement(state, workflow.id, measurement);
  assert.equal(compareLocalMeasurement(missing, withMeasurement.measurements[0]), null);
  const other = addPreviewWorkspace(state, "Other fixture workspace");
  assert.throws(() => addLocalMeasurement(other, workflow.id, measurement), PreviewStateError);
  assert.throws(() => saveLocalScenario(other, workflow.id, scenario, "user_scenario"), PreviewStateError);
});

test("dashboard keeps absent values null and does not mix months or historical measurement savings", () => {
  const state = createPreviewState();
  assert.equal(previewDashboard(state).localScenarioNetValue, null);
  assert.equal(previewDashboard(state).measurementCount, 0);
  const saved = saveLocalScenario(state, state.workflows[0].id, { ...scenario, reduction_percent: 0 }, "user_scenario");
  const measured = addLocalMeasurement(saved, state.workflows[0].id, measurement);
  const summary = previewDashboard(measured);
  assert.equal(summary.scenarioCount, 1);
  assert.equal(summary.workflowCount, 6);
  assert.equal(summary.localScenarioNetValue, -20);
  assert.equal(summary.measurementCount, 1);
  assert.equal("measuredSavings" in summary, false);
  const other = addPreviewWorkspace(measured, "Empty preview");
  assert.equal(previewDashboard(other).workflowCount, 0);
  assert.equal(previewDashboard(other).measurementCount, 0);
  assert.equal(previewDashboard(other).localScenarioNetValue, null);
});

test("static analysis fixtures distinguish family/action/priority/confidence and unavailable provenance", () => {
  const live = analysisExample("live_ai");
  assert.equal(live.task_family, "catalog_copy");
  assert.equal(live.recommendation, "AI-ASSISTED");
  assert.equal(live.priority_score, 64);
  assert.equal(live.ml_confidence, 0.81);
  assert.match(live.provider_model!, /SIMULATED/);
  const fallback = analysisExample("reviewed_fallback");
  assert.equal(fallback.mode, "reviewed_playbook_fallback");
  assert.equal(fallback.provider_model, null);
  assert.match(fallback.playbook_id!, /NOT-REVIEWED/);
  assert.equal(analysisExample("abstained").ml_status, "abstained");
  const unavailable = analysisExample("unavailable");
  assert.equal(unavailable.mode, "needs_clarification");
  for (const key of ["task_family", "ml_confidence", "model_version", "playbook_id", "provider_model", "prompt_version"] as const)
    assert.equal(unavailable[key], null);
  live.steps.push("consumer mutation");
  assert.equal(analysisExample("live_ai").steps.includes("consumer mutation"), false);
  assert.deepEqual(createPreviewState().analyses, [], "reference examples never populate actual workflow analysis");
});

test("failure presentation preserves correlation and distinguishes auth, conflicts, validation and safe read retry", () => {
  const expected = { network: "retry_read", unauthenticated: "signin", forbidden: "reload", not_found: "reload", conflict: "reconcile", validation: "correct", rate_limited: "retry_read", dependency: "retry_read" } as const;
  for (const [kind, action] of Object.entries(expected)) {
    const failure = presentFailure(failureExample(kind as keyof typeof expected));
    assert.equal(failure.action, action);
    assert.equal(failure.requestId, "ce5d45af-fd7d-47ed-af84-d410385ebc31");
  }
  assert.match(presentFailure(failureExample("network")).message, /Refetch before retrying a write/);
  assert.match(presentFailure(failureExample("conflict")).message, /reconcile/);
  assert.equal(presentFailure(new PreviewStateError("stale_version", "stale")).action, "reconcile");
  assert.equal(presentFailure(new ApiInputError("period", "Use YYYY-MM.")).details.length, 1);
  assert.equal(presentFailure(new ApiClientError("http", "internal_error", "safe", 500, "id")).requestId, "id");
  assert.equal(presentFailure(new ApiClientError("http", "dependency_unavailable", "safe", 503, "id", [], false)).action, "none");
  assert.equal(presentFailure(new Error("private internal detail")).message.includes("private"), false);
});

test("fixture report escapes text, keeps provenance and periods, and includes no fake analysis", () => {
  const state = createPreviewState();
  const workflow = state.workflows[0];
  const renamed = editPreviewWorkflow(state, workflow.id, 1, {
    ...workflowFromApi(workflow), name: '<script>alert("x")</script>', description: '<img src=x onerror="alert(1)"> & user text',
  });
  const html = createFixtureReportHtml(renamed);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("<img"), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Not measured yet/);
  assert.match(html, /no savings assumed/);
  assert.match(html, /development fixture report/);
  assert.equal(escapeReportText("<&>\"'"), "&lt;&amp;&gt;&quot;&#39;");
  const recorded = addLocalMeasurement(saveLocalScenario(state, workflow.id, scenario, "illustrative_sample"), workflow.id, measurement);
  const report = createFixtureReportHtml(recorded);
  assert.match(report, /Hypothetical/);
  assert.match(report, /2026-10/);
  assert.match(report, /illustrative_sample/);
  assert.match(report, /No live recommendation/);
  assert.equal(state.measurements.length, 0);
});
