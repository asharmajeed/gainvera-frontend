import test from "node:test";
import assert from "node:assert/strict";
import { ApiClientError, ApiInputError, createGainveraHttpClient, scenarioEditContext, scenarioSaveBody } from "../src/lib/api";
import type { ApiAnalysis, ApiAnalysisState, ApiDashboard, ApiMeasurement, ApiScenarioState, ApiWorkflow, ApiWorkflowBaseline, ApiWorkspace } from "../src/lib/api";
import { AccountStore, type AccountSession, type AuthPort } from "../src/lib/account/store";
import { WorkflowResultsStore, WorkspaceResultsStore } from "../src/lib/account/results-store";
import { accountConfiguration } from "../src/lib/account/config";

// Injected protocol examples only. No model, actual review or business observation.
const wsId = "c0ae0b3a-e90c-443b-bc7e-a6c4275b274a", wsB = "d0ae0b3a-e90c-443b-bc7e-a6c4275b274a";
const id = "f1393f14-ee79-4eae-8e31-dff6743aeb38", idB = "e1393f14-ee79-4eae-8e31-dff6743aeb38";
const analysisId = "98122d0b-bafd-4c66-8f08-49dd91467b7e", newAnalysisId = "88122d0b-bafd-4c66-8f08-49dd91467b7e";
const stamp = "2026-10-28T09:23:04.123456+00:00", nextStamp = "2026-10-28T09:23:04.123457+00:00";
const correlation = "ce5d45af-fd7d-47ed-af84-d410385ebc31";
const workspace: ApiWorkspace = { id: wsId, owner_id: analysisId, name: "Injected workspace", currency: "USD", created_at: stamp };
const workflow: ApiWorkflow = { id, workspace_id: wsId, name: "Injected catalog task", description: "Draft product descriptions from verified facts with human review.", hours_per_occurrence: 0.25, occurrences_per_month: 40, hourly_cost: 20, current_tools: "Spreadsheet", pain_points: "Repeated drafting", risk: "medium", data_availability: "digital", is_sample: true, baseline_version: 1, analysis_status: "analyzed", created_at: stamp, updated_at: stamp };
const analysis: ApiAnalysis = { id: analysisId, workflow_id: id, baseline_version: 1, rules_version: "INJECTED-TEST-ONLY", ml_reason: null, guidance_reason: "static_requested", safety_reasons: ["Human review"], task_family: "catalog_copy", recommendation: "AI-ASSISTED", priority_score: 31, priority_components: { value: 0, feasibility: 60, readiness: 100, safety: 55 }, mode: "reviewed_playbook_fallback", ml_status: "recognized", ml_confidence: 0.8, model_version: "INJECTED-NO-PERFORMANCE-CLAIM", playbook_id: "INJECTED-BOOK", playbook_version: "TEST", provider_model: null, prompt_version: null, summary: "Injected result for protocol tests.", steps: ["Review confirmed facts."], human_review: "A person reviews every draft.", risks: ["Unsupported claims"], missing_information: [], created_at: stamp };
const ready: ApiAnalysisState = { state: "ready", current_baseline_version: 1, analysis, playbook: { id: "INJECTED-BOOK", version: "TEST", task_family: "catalog_copy", title: "Injected reviewed-response shape", conditions: "Test conditions only", base_recommendation: "AI-ASSISTED", difficulty: 50, required_inputs: ["Confirmed facts"], steps: ["Review"], example_template: "Test only", human_review: "Review", risks: [], measurement_method: "Separate upkeep", provenance: { synthetic: true, actual_review: false }, review_status: "reviewed", reviewed_by: "Injected test double, no actual review", reviewed_at: stamp, created_at: stamp } };
const assumptions = { baseline_version: 1, reduction_percent: 40, setup_hours: 2, setup_fees: 0, monthly_tool_fees: 500, monthly_maintenance_hours: 0.5 };
const scenario: ApiScenarioState = { state: "ready", current_baseline_version: 1, scenario: { ...assumptions, id: "78122d0b-bafd-4c66-8f08-49dd91467b7e", workflow_id: id, analysis_id: analysisId, assumption_source: "user_scenario", updated_at: stamp }, roi: { baseline_monthly_hours: 10, gross_hours_saved: 4, production_and_review_hours_after: 6, total_hours_after: 6.5, gross_capacity_value: 80, recurring_cost: 510, net_monthly_value: -430, initial_investment: 40, first_month_value: -470, payback_months: null, net_hours_released: 3.5 }, priority_score: 31 };
const none: ApiScenarioState = { state: "not_set", current_baseline_version: 1, scenario: null, roi: null, priority_score: null };
const baseline: ApiWorkflowBaseline = { workflow_id: id, baseline_version: 1, snapshot: workflow, created_at: stamp };
const measurement: ApiMeasurement = { id: "68122d0b-bafd-4c66-8f08-49dd91467b7e", workflow_id: id, baseline_version: 1, period: "2026-09", production_and_review_hours_after: 6.5, maintenance_hours_after: 0.5, monthly_tools_and_fees: 10, initial_implementation_cost: 40, is_demo: true, created_at: stamp };
const dashboard: ApiDashboard = { workspace, generated_at: stamp, coverage: { ready: 1, not_analyzed: 1, needs_clarification: 0, needs_reanalysis: 0, total_workflows: 2, current_scenarios: 1, measurement_records: 1 }, scenario_totals: { baseline_monthly_hours: 10, gross_hours_saved: 4, net_hours_released: 3.5, net_monthly_value: -430, initial_investment: 40, first_month_value: -470, covered_workflows: 1, all_workflow_monthly_hours: 20 }, ranked_workflows: [{ workflow, analysis_state: ready, scenario_state: scenario }, { workflow: { ...workflow, id: idB, analysis_status: "not_analyzed" }, analysis_state: { state: "not_analyzed", current_baseline_version: 1, analysis: null, playbook: null }, scenario_state: none }], measurements: [{ measurement, original_baseline: baseline, net_hours_released: 3, net_monthly_value: 50, first_month_value: 10, provenance: "hypothetical" }], notes: ["Injected server snapshot; no real savings."] };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "X-Request-ID": correlation } });
const page = (items: unknown[], next_cursor: string | null = null) => ({ items, next_cursor });
function failure(status: number, duplicate = false) { return json({ error: { code: status === 409 ? "conflict" : status === 401 ? "unauthenticated" : "dependency_unavailable", message: "Injected failure", request_id: correlation, retryable: status === 503, details: duplicate ? [{ field: "body.period", code: "duplicate_measurement", message: "Already recorded" }] : [] } }, status); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((fn) => { resolve = fn; }); return { promise, resolve }; }
const settle = () => new Promise((resolve) => setTimeout(resolve, 15));
const config = accountConfiguration({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", NEXT_PUBLIC_GAINVERA_API_URL: "http://127.0.0.1:8000" });
class AuthDouble implements AuthPort {
  current: AccountSession | null = { user: { id: "A" }, access_token: "INJECTED-TOKEN-A" };
  listener?: (event: string, session: AccountSession | null) => void;
  async getSession() { return { data: { session: this.current }, error: null }; }
  async signInWithPassword() { return { data: { session: this.current }, error: null }; }
  async signOut() { this.emit(null); return { error: null }; }
  emit(value: AccountSession | null) { this.current = value; this.listener?.(value ? "SIGNED_IN" : "SIGNED_OUT", value); }
  onAuthStateChange(fn: (event: string, session: AccountSession | null) => void) { this.listener = fn; return { data: { subscription: { unsubscribe: () => { this.listener = undefined; } } } }; }
}
type Override = (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined;
function server(override?: Override) {
  const calls: { url: URL; method: string; body: Record<string, unknown> | null; headers: Headers; signal?: AbortSignal | null }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input)), method = init?.method ?? "GET";
    calls.push({ url, method, body: init?.body ? JSON.parse(String(init.body)) : null, headers: new Headers(init?.headers), signal: init?.signal });
    const custom = override?.(url, init); if (custom !== undefined) return custom;
    if (url.pathname === "/workspaces") return json(page([workspace, { ...workspace, id: wsB }]));
    if (url.pathname === "/workflows") return json(page([workflow]));
    if (url.pathname.endsWith("/analysis") || url.pathname.endsWith("/analyze")) return json(ready);
    if (url.pathname.endsWith("/scenario")) return json(scenario);
    if (url.pathname.endsWith("/baselines")) return json(page([baseline]));
    if (url.pathname.endsWith("/measurements")) return json(method === "POST" ? measurement : page([measurement]), method === "POST" ? 201 : 200);
    if (url.pathname === "/dashboard") return json(dashboard);
    if (url.pathname.startsWith("/reports/")) return new Response("<!doctype html><h1>Injected report</h1>", { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": 'attachment; filename="safe-report.html"' } });
    return json({ ...workflow, id: url.pathname.split("/").at(-1) });
  };
  return { calls, fetcher };
}
async function setup(override?: Override) {
  const mock = server(override), auth = new AuthDouble();
  const parent = new AccountStore(config, () => auth, mock.fetcher), stopParent = parent.start();
  await settle(); parent.selectWorkspace(wsId); await settle(); await parent.openWorkflow(id);
  const results = new WorkflowResultsStore(parent, parent.getSnapshot().detail!), stop = results.start(); await settle();
  return { ...mock, auth, parent, results, close: () => { stop(); stopParent(); } };
}

test("v2 envelopes retain nullable provenance, negative authoritative ROI and exact timestamps; bare/unknown states are protocol errors", async () => {
  const mock = server(); const api = createGainveraHttpClient({ baseUrl: "http://test", getAccessToken: () => "INJECTED", fetch: mock.fetcher });
  const a = (await api.getAnalysis(id)).body; assert.equal(a.state, "ready"); assert.equal(a.analysis?.provider_model, null); assert.equal(a.analysis?.rules_version, "INJECTED-TEST-ONLY");
  const s = (await api.getScenario(id)).body; assert.equal(s.roi?.net_monthly_value, -430); assert.equal(s.roi?.payback_months, null); assert.equal(s.scenario?.updated_at, stamp);
  for (const body of [analysis, { ...ready, state: "invented" }, { ...ready, analysis: { ...analysis, ml_status: "mystery" } }]) {
    const bad = createGainveraHttpClient({ baseUrl: "http://test", getAccessToken: () => "INJECTED", fetch: async () => json(body) });
    await assert.rejects(bad.getAnalysis(id), (error) => error instanceof ApiClientError && error.kind === "protocol" && error.requestId === correlation);
  }
});
test("analyze/scenario requests whitelist v2 fields and preserve required null or microsecond CAS strings", async () => {
  const mock = server(); const api = createGainveraHttpClient({ baseUrl: "http://test", getAccessToken: () => "INJECTED", fetch: mock.fetcher });
  await api.analyzeWorkflow(id, { baseline_version: 1, guidance_preference: "reviewed_playbook", owner_id: "DROP" } as never);
  await api.saveScenario(id, { ...assumptions, analysis_id: analysisId, expected_updated_at: stamp, priority_score: 99 } as never);
  assert.deepEqual(mock.calls[0].body, { baseline_version: 1, guidance_preference: "reviewed_playbook" });
  assert.deepEqual(Object.keys(mock.calls[1].body!).sort(), [...Object.keys(assumptions), "analysis_id", "expected_updated_at"].sort());
  assert.equal(mock.calls[1].body?.expected_updated_at, stamp);
  assert.equal(scenarioSaveBody({ ...assumptions, analysis_id: analysisId, expected_updated_at: null }).expected_updated_at, null);
  for (const value of [undefined, "2026-10-28", new Date()]) assert.throws(() => scenarioSaveBody({ ...assumptions, analysis_id: analysisId, expected_updated_at: value } as never), ApiInputError);
});
test("first-save concurrency context is per analysis, including same-baseline reanalysis, not per workflow", () => {
  assert.equal(scenarioEditContext(ready, scenario)?.expected_updated_at, stamp);
  const rerun = { ...ready, analysis: { ...analysis, id: newAnalysisId } };
  assert.equal(scenarioEditContext(rerun, { ...scenario, state: "needs_reanalysis" })?.expected_updated_at, null);
  assert.equal(scenarioEditContext(rerun, scenario)?.analysis_id, newAnalysisId);
  assert.equal(scenarioEditContext(rerun, scenario)?.expected_updated_at, null);
  assert.equal(scenarioEditContext({ ...ready, state: "needs_clarification" }, scenario), null);
  assert.equal(scenarioEditContext(ready, { ...scenario, state: "historical" })?.expected_updated_at, null);
});
test("history and measurement bindings preserve scoped pagination, original costs and historical versions", async () => {
  const newer = { ...workflow, baseline_version: 2, hourly_cost: 80 };
  const app = await setup((url) => {
    if (url.pathname.endsWith("/baselines")) return json(url.searchParams.has("cursor") ? page([{ ...baseline, baseline_version: 2, snapshot: newer }]) : page([baseline], "history/+ token"));
    return undefined;
  });
  await app.results.loadBaselines(true);
  assert.equal(app.results.getSnapshot().baselines.items.length, 2);
  assert.equal(app.results.getSnapshot().baselines.items[0].snapshot.hourly_cost, 20);
  assert.equal(app.calls.find((call) => call.url.searchParams.has("cursor"))?.url.searchParams.get("cursor"), "history/+ token");
  await app.results.saveMeasurement({ ...measurement, period: "2026-10" });
  const posted = app.calls.find((call) => call.method === "POST" && call.url.pathname.endsWith("/measurements"))!;
  assert.equal(posted.body?.baseline_version, 1); assert.ok(!("id" in posted.body!)); assert.equal(posted.body?.maintenance_hours_after, 0.5);
  assert.equal(app.results.getSnapshot().comparisons.data?.measurements[0].original_baseline.snapshot.hourly_cost, 20);
  await assert.rejects(app.results.saveMeasurement({ ...measurement, baseline_version: 9 }), ApiClientError); app.close();
});
test("dashboard uses the complete server snapshot beyond the visible workflow page and retains null estimates", async () => {
  const app = await setup(); const dashboardStore = new WorkspaceResultsStore(app.parent), stop = dashboardStore.start(); await settle();
  assert.equal(app.parent.getSnapshot().workflows.items.length, 1);
  assert.equal(dashboardStore.getSnapshot().dashboard.data?.coverage.total_workflows, 2);
  assert.equal(dashboardStore.getSnapshot().dashboard.data?.ranked_workflows.length, 2);
  assert.equal(dashboardStore.getSnapshot().dashboard.data?.scenario_totals.net_monthly_value, -430);
  stop(); app.close();
  const emptyTotals = { ...dashboard, scenario_totals: { ...dashboard.scenario_totals, baseline_monthly_hours: null, gross_hours_saved: null, net_hours_released: null, net_monthly_value: null, initial_investment: null, first_month_value: null, covered_workflows: 0 } };
  const api = createGainveraHttpClient({ baseUrl: "http://test", getAccessToken: () => "INJECTED", fetch: async () => json(emptyTotals) });
  assert.equal((await api.getDashboard(wsId)).body.scenario_totals.net_monthly_value, null);
});
test("report download is authenticated HTML/blob with a safe filename and no credential URL", async () => {
  const mock = server((url) => url.pathname.startsWith("/reports/") ? new Response("<h1>Escaped server report</h1>", { headers: { "Content-Type": "text/html", "Content-Disposition": 'attachment; filename="../../unsafe.html"' } }) : undefined);
  const api = createGainveraHttpClient({ baseUrl: "http://test", getAccessToken: () => "INJECTED-PRIVATE-TOKEN", fetch: mock.fetcher });
  const report = await api.getReport(wsId);
  assert.equal(report.body.filename, "gainvera-audit.html"); assert.equal(await report.body.blob.text(), "<h1>Escaped server report</h1>");
  assert.equal(mock.calls[0].headers.get("Authorization"), "Bearer INJECTED-PRIVATE-TOKEN"); assert.equal(mock.calls[0].headers.get("Accept"), "text/html"); assert.doesNotMatch(mock.calls[0].url.href, /INJECTED|token/i);
  const bad = createGainveraHttpClient({ baseUrl: "http://test", getAccessToken: () => "INJECTED", fetch: async () => json({}) });
  await assert.rejects(bad.getReport(wsId), (error) => error instanceof ApiClientError && error.kind === "protocol");
});
test("analysis clarification comes from its envelope even when workflow status is analyzed", async () => {
  const clarification: ApiAnalysisState = { ...ready, state: "needs_clarification", analysis: { ...analysis, task_family: null, mode: "needs_clarification", ml_status: "abstained", ml_reason: "ambiguous", ml_confidence: 0.12, missing_information: ["Confirm risk"], playbook_id: null, playbook_version: null }, playbook: null };
  const app = await setup((url) => url.pathname.endsWith("/analysis") ? json(clarification) : undefined);
  assert.equal(app.results.getSnapshot().workflow.analysis_status, "analyzed"); assert.equal(app.results.getSnapshot().analysis.data?.state, "needs_clarification");
  assert.equal(app.results.getSnapshot().analysis.data?.analysis?.ml_status, "abstained"); app.close();
});
test("analyze service failures preserve prior saved results and require a read before any explicit rerun", async () => {
  const app = await setup((url, init) => url.pathname.endsWith("/analyze") && init?.method === "POST" ? failure(503) : undefined);
  await assert.rejects(app.results.analyze(), ApiClientError); assert.equal(app.results.getSnapshot().analysis.data?.analysis?.id, analysisId);
  assert.equal(app.results.getSnapshot().needsRead.analysis, true);
  await assert.rejects(app.results.analyze(), ApiClientError); assert.equal(app.calls.filter((call) => call.url.pathname.endsWith("/analyze")).length, 1);
  assert.ok(await app.results.refreshContext()); assert.equal(app.results.getSnapshot().needsRead.analysis, false); app.close();
});
test("scenario 409 retains server state, never replays PUT and refreshes the exact latest CAS token", async () => {
  let changed = false;
  const app = await setup((url, init) => {
    if (url.pathname.endsWith("/scenario") && init?.method === "PUT") { changed = true; return failure(409); }
    if (url.pathname.endsWith("/scenario") && changed) return json({ ...scenario, scenario: { ...scenario.scenario!, updated_at: nextStamp } });
    return undefined;
  });
  await assert.rejects(app.results.saveScenario({ ...assumptions, analysis_id: analysisId, expected_updated_at: stamp }), ApiClientError);
  assert.equal(app.results.getSnapshot().scenario.data?.scenario?.updated_at, stamp); assert.equal(app.results.getSnapshot().needsRead.scenario, true);
  await app.results.refreshContext(); assert.equal(app.results.getSnapshot().scenario.data?.scenario?.updated_at, nextStamp);
  assert.equal(app.calls.filter((call) => call.method === "PUT").length, 1); app.close();
});
test("duplicate measurement conflicts keep their stable field code and reconcile all pages without overwriting", async () => {
  const second = { ...measurement, id: newAnalysisId, period: "2026-10" };
  const app = await setup((url, init) => {
    if (!url.pathname.endsWith("/measurements")) return undefined;
    if (init?.method === "POST") return failure(409, true);
    return json(url.searchParams.has("cursor") ? page([second]) : page([measurement], "next-measurements"));
  });
  await assert.rejects(app.results.saveMeasurement({ ...measurement, period: "2026-10" }), (error) => error instanceof ApiClientError && error.details[0].code === "duplicate_measurement");
  assert.equal(app.results.getSnapshot().needsRead.measurement, true); assert.ok(await app.results.reconcileMeasurement());
  assert.equal(app.results.getSnapshot().measurements.items.length, 2); assert.equal(app.calls.filter((call) => call.method === "POST").length, 1); app.close();
});
test("a late pre-insert measurement page cannot discard a newly saved observation", async () => {
  const delayed = deferred<Response>(); let reads = 0;
  const app = await setup((url, init) => url.pathname.endsWith("/measurements") && init?.method !== "POST" && ++reads > 1 ? delayed.promise : undefined);
  const pending = app.results.loadMeasurements(); await app.results.saveMeasurement(measurement);
  delayed.resolve(json(page([]))); await pending;
  assert.equal(app.results.getSnapshot().measurements.items[0].id, measurement.id); app.close();
});
test("old workflow analysis responses and 401 errors cannot affect a newly selected workflow", async () => {
  for (const expired of [false, true]) {
    const delayed = deferred<Response>();
    const app = await setup((url) => url.pathname === `/workflows/${id}/analysis` ? delayed.promise : url.pathname === `/workflows/${idB}/analysis` ? json({ ...ready, analysis: { ...analysis, workflow_id: idB } }) : undefined);
    await app.parent.openWorkflow(idB); const next = new WorkflowResultsStore(app.parent, app.parent.getSnapshot().detail!), stop = next.start(); await settle();
    delayed.resolve(expired ? failure(401) : json(ready)); await settle();
    assert.equal(app.parent.getSnapshot().phase, "signed_in"); assert.equal(app.parent.getSnapshot().detail?.id, idB); assert.equal(next.getSnapshot().analysis.data?.analysis?.workflow_id, idB);
    assert.equal(app.results.getSnapshot().analysis.data, null); stop(); app.close();
  }
});
test("late report responses are discarded on account/workspace changes, with no file delivery", async () => {
  for (const accountChange of [false, true]) {
    const delayed = deferred<Response>(); const app = await setup((url) => url.pathname.startsWith("/reports/") ? delayed.promise : undefined);
    const store = new WorkspaceResultsStore(app.parent), stop = store.start(); await settle(); let downloads = 0;
    const exported = store.exportReport(() => { downloads++; });
    if (accountChange) { app.auth.emit({ user: { id: "B" }, access_token: "INJECTED-B" }); await settle(); }
    app.parent.selectWorkspace(wsB); await settle(); delayed.resolve(accountChange ? failure(401) : new Response("<h1>Old report</h1>", { headers: { "Content-Type": "text/html" } })); await exported;
    assert.equal(downloads, 0); assert.equal(app.parent.getSnapshot().phase, "signed_in"); assert.equal(app.parent.getSnapshot().workspaceId, wsB); stop(); app.close();
  }
});

test("late dashboard data and 401s cannot replace or clear a different account, workspace or workflow view", async () => {
  for (const change of ["account", "workspace", "workflow"] as const) {
    const delayed = deferred<Response>();
    const current = await setup((url) => url.pathname === "/dashboard" ? delayed.promise : undefined);
    const store = new WorkspaceResultsStore(current.parent), stop = store.start(); await settle();
    if (change === "account") { current.auth.emit({ user: { id: "B" }, access_token: "INJECTED-B" }); await settle(); }
    if (change === "workspace") current.parent.selectWorkspace(wsB);
    if (change === "workflow") await current.parent.openWorkflow(idB);
    delayed.resolve(change === "account" ? failure(401) : json(dashboard)); await settle();
    assert.equal(store.getSnapshot().dashboard.data, null);
    assert.equal(current.parent.getSnapshot().phase, "signed_in"); stop(); current.close();
  }
});
test("export delivery also checks workflow selection, and a current result 401 clears protected account state", async () => {
  const delayed = deferred<Response>(); const app = await setup((url) => url.pathname.startsWith("/reports/") ? delayed.promise : undefined);
  const store = new WorkspaceResultsStore(app.parent), stop = store.start(); await settle(); let downloads = 0;
  const pending = store.exportReport(() => { downloads++; }); await app.parent.openWorkflow(idB);
  delayed.resolve(new Response("<h1>Old view</h1>", { headers: { "Content-Type": "text/html" } })); await pending; assert.equal(downloads, 0); stop(); app.close();
  const unauthorized = await setup((url) => url.pathname.endsWith("/analysis") ? failure(401) : undefined);
  assert.equal(unauthorized.parent.getSnapshot().phase, "signed_out"); assert.deepEqual(unauthorized.parent.getSnapshot().workflows.items, []); assert.equal(unauthorized.parent.getSnapshot().detail, null); unauthorized.close();
});
