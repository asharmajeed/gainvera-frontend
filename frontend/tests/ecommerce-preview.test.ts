import test from "node:test";
import assert from "node:assert/strict";
import {
  ApiClientError, ApiInputError, createGainveraHttpClient,
  workflowFromApi, workflowPatchBody, workflowToPatchRequest,
} from "../src/lib/api";
import type { ApiAnalysis, ApiMeasurement, ApiScenario } from "../src/lib/api";
import { storeExamples } from "../src/lib/ecommerce/examples";
import {
  addPreviewWorkflow, addPreviewWorkspace, baselineForMeasurement, createPreviewState,
  currentPreviewAnalysis, currentPreviewScenario, deletePreviewWorkflow, editPreviewWorkflow,
  loadPreviewExamples, PreviewStateError, selectPreviewWorkspace,
} from "../src/lib/ecommerce/preview";

test("the preview seeds six labelled input topics with no predictions or fabricated results", () => {
  const state = createPreviewState();
  assert.deepEqual(storeExamples.map((item) => item.family), [
    "catalog_copy", "support_reply", "stock_alert", "catalog_cleanup", "order_report", "refund_approval",
  ]);
  assert.equal(state.workflows.length, 6);
  assert.equal(state.baselines.length, 6);
  assert.equal(state.workflows.every((item) => item.is_sample && item.analysis_status === "not_analyzed"), true);
  assert.equal(state.workflows[0].risk, "unknown");
  assert.equal(state.workflows[0].data_availability, "unknown");
  assert.equal(state.workflows[5].risk, "high");
  assert.match(state.workflows[5].description, /human.*approves/i);
  assert.deepEqual([state.analyses, state.scenarios, state.measurements], [[], [], []]);
  assert.equal(loadPreviewExamples(state), state, "repeated loading does not duplicate examples");
});

test("workspace creation starts empty; switching preserves isolated preview records", () => {
  const initial = createPreviewState();
  const added = addPreviewWorkspace(initial, "  A second fictional shop  ");
  const secondId = added.selectedWorkspaceId;
  assert.equal(added.workspaces.at(-1)?.name, "A second fictional shop");
  assert.equal(added.workflows.filter((item) => item.workspace_id === secondId).length, 0);
  const populated = loadPreviewExamples(added);
  assert.equal(populated.workflows.filter((item) => item.workspace_id === secondId).length, 6);
  const back = selectPreviewWorkspace(populated, initial.selectedWorkspaceId);
  assert.equal(back.workflows.filter((item) => item.workspace_id === back.selectedWorkspaceId).length, 6);
  assert.equal(initial.workspaces.length, 1);
  assert.throws(() => selectPreviewWorkspace(initial, "missing"), PreviewStateError);
  assert.throws(() => addPreviewWorkspace(initial, "   "), ApiInputError);
});

test("creating a workflow retains decimal/zero facts and defaults readiness to unknown", () => {
  const state = createPreviewState();
  const created = addPreviewWorkflow(state, {
    name: "New fictional workflow", description: "Gather an order export for internal review.",
    hours: 0.125, frequency: 0.5, hourlyCost: 0,
  });
  const record = created.workflows.at(-1)!;
  assert.equal(record.hours_per_occurrence, 0.125);
  assert.equal(record.occurrences_per_month, 0.5);
  assert.equal(record.hourly_cost, 0);
  assert.equal(record.risk, "unknown");
  assert.equal(record.data_availability, "unknown");
  assert.equal(record.baseline_version, 1);
  assert.equal(record.analysis_status, "not_analyzed");
  assert.equal(record.is_sample, true);
  assert.equal(state.workflows.length, 6, "creation does not mutate the previous state");
});

function historicalState() {
  const state = createPreviewState();
  const workflow = { ...state.workflows[0], analysis_status: "analyzed" as const };
  const analysis: ApiAnalysis = {
    id: "synthetic-analysis", workflow_id: workflow.id, baseline_version: 1,
    task_family: null, recommendation: "LEAVE ALONE", priority_score: 0,
    priority_components: { value: 0, feasibility: 0, readiness: 20, safety: 30 },
    mode: "needs_clarification", ml_status: "unavailable", ml_confidence: null,
    model_version: null, playbook_id: null, playbook_version: null,
    provider_model: null, prompt_version: null, summary: "Synthetic history test only.",
    steps: [], human_review: "Human decisions retained.", risks: [], missing_information: [], created_at: workflow.created_at,
  };
  const scenario: ApiScenario = {
    id: "synthetic-scenario", workflow_id: workflow.id, analysis_id: analysis.id, baseline_version: 1,
    reduction_percent: 0, setup_hours: 0, setup_fees: 0, monthly_tool_fees: 0,
    monthly_maintenance_hours: 0, assumption_source: "illustrative_sample", updated_at: workflow.updated_at,
  };
  const measurement: ApiMeasurement = {
    id: "synthetic-measurement", workflow_id: workflow.id, baseline_version: 1, period: "2026-10",
    production_and_review_hours_after: 9, maintenance_hours_after: 1, monthly_tools_and_fees: 0,
    initial_implementation_cost: 0, is_demo: true, created_at: workflow.created_at,
  };
  return {
    ...state, workflows: state.workflows.map((item) => item.id === workflow.id ? workflow : item),
    analyses: [analysis], scenarios: [scenario], measurements: [measurement],
  };
}

test("baseline edits invalidate current results and keep historical measurements on original cost/time", () => {
  const original = historicalState();
  const workflow = original.workflows[0];
  assert.ok(currentPreviewAnalysis(original, workflow));
  assert.ok(currentPreviewScenario(original, workflow));
  const edited = editPreviewWorkflow(original, workflow.id, 1, { ...workflowFromApi(workflow), hours: 3, hourlyCost: 50 });
  const current = edited.workflows[0];
  assert.equal(current.baseline_version, 2);
  assert.equal(current.analysis_status, "needs_reanalysis");
  assert.equal(currentPreviewAnalysis(edited, current), null);
  assert.equal(currentPreviewScenario(edited, current), null);
  assert.deepEqual(edited.measurements, original.measurements);
  assert.deepEqual(edited.analyses, original.analyses);
  assert.deepEqual(edited.scenarios, original.scenarios);
  const baseline = baselineForMeasurement(edited, edited.measurements[0])!;
  assert.equal(baseline.baseline_version, 1);
  assert.equal(baseline.hourly_cost, 20);
  assert.equal(baseline.hours_per_occurrence, 0.25);
  assert.equal(workflow.baseline_version, 1);
  assert.equal(edited.baselines.filter((item) => item.id === workflow.id).length, 2);
  assert.equal(baselineForMeasurement(edited, { ...edited.measurements[0], baseline_version: 99 }), null);
});

test("no-op edits keep versions and stale or cross-workspace edits cannot overwrite records", () => {
  const state = createPreviewState();
  const workflow = state.workflows[0];
  assert.equal(editPreviewWorkflow(state, workflow.id, 1, workflowFromApi(workflow)), state);
  assert.equal(workflowToPatchRequest(workflowFromApi(workflow), workflow), null);
  const edited = editPreviewWorkflow(state, workflow.id, 1, { ...workflowFromApi(workflow), name: "A revised fictional name" });
  assert.throws(() => editPreviewWorkflow(edited, workflow.id, 1, workflowFromApi(workflow)),
    (error: unknown) => error instanceof PreviewStateError && error.code === "stale_version");
  const other = addPreviewWorkspace(state, "Other store");
  assert.throws(() => editPreviewWorkflow(other, workflow.id, 1, workflowFromApi(workflow)), PreviewStateError);
  assert.throws(() => deletePreviewWorkflow(other, workflow.id), PreviewStateError);
});

test("confirmed local deletion removes child history/results while retaining other workflows", () => {
  const state = historicalState();
  const result = deletePreviewWorkflow(state, state.workflows[0].id);
  assert.equal(result.workflows.length, 5);
  assert.equal(result.baselines.length, 5);
  assert.deepEqual([result.analyses, result.scenarios, result.measurements], [[], [], []]);
  assert.equal(state.workflows.length, 6);
  assert.equal(state.measurements.length, 1);
});

test("v1.1 edit requests include only changed facts and the expected baseline version", () => {
  const workflow = createPreviewState().workflows[0];
  assert.deepEqual(workflowToPatchRequest({ ...workflowFromApi(workflow), hours: 0.5 }, workflow), {
    baseline_version: 1, hours_per_occurrence: 0.5,
  });
  for (const input of [
    { baseline_version: 1 }, { baseline_version: 1, risk: null },
    { baseline_version: 1, workspace_id: workflow.workspace_id }, { baseline_version: 1, analysis_status: "analyzed" },
    { baseline_version: 0, name: "name" }, { baseline_version: 1, hours_per_occurrence: NaN },
  ]) assert.throws(() => workflowPatchBody(input as never), ApiInputError);
});

test("prepared page/PATCH bindings encode cursors and expose conflicts without replaying writes", async () => {
  const workflow = createPreviewState().workflows[0];
  let calls = 0;
  const api = createGainveraHttpClient({
    baseUrl: "http://127.0.0.1:8000", getAccessToken: () => "synthetic-test-token",
    fetch: async (input, init) => {
      calls++;
      const url = new URL(String(input));
      if (init?.method === "PATCH") {
        assert.deepEqual(JSON.parse(init.body as string), { baseline_version: 1, hourly_cost: 25 });
        return new Response(JSON.stringify({ error: {
          code: "conflict", message: "The baseline changed.", request_id: "ce5d45af-fd7d-47ed-af84-d410385ebc31", details: [], retryable: false,
        } }), { status: 409, headers: { "Content-Type": "application/json" } });
      }
      assert.equal(url.searchParams.get("workspace_id"), workflow.workspace_id);
      assert.equal(url.searchParams.get("limit"), "1");
      assert.equal(url.searchParams.get("cursor"), "opaque+cursor/=");
      return new Response(JSON.stringify({ items: [workflow], next_cursor: "next-opaque-cursor" }), { headers: { "Content-Type": "application/json" } });
    },
  });
  const page = await api.listWorkflows(workflow.workspace_id, { limit: 1, cursor: "opaque+cursor/=" });
  assert.equal(page.body.next_cursor, "next-opaque-cursor");
  await assert.rejects(api.patchWorkflow(workflow.id, { baseline_version: 1, hourly_cost: 25 }),
    (error: unknown) => error instanceof ApiClientError && error.status === 409 && !error.retryable);
  assert.equal(calls, 2);
  assert.throws(() => api.listWorkspaces({ limit: 101 }), ApiClientError);
});
