import test from "node:test";
import assert from "node:assert/strict";
import { accountConfiguration } from "../src/lib/account/config";
import { AccountChangedError, AccountStore, type AccountSession, type AuthPort } from "../src/lib/account/store";
import { ApiClientError } from "../src/lib/api";

const config = accountConfiguration({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test", NEXT_PUBLIC_GAINVERA_API_URL: "http://127.0.0.1:8000" });
const session = (id = "A", token = `token-${id}`): AccountSession => ({ user: { id }, access_token: token });
const workspaceA = "c0ae0b3a-e90c-443b-bc7e-a6c4275b274a";
const workspaceB = "d0ae0b3a-e90c-443b-bc7e-a6c4275b274a";
const workspace = (id = workspaceA) => ({ id, name: id, owner_id: "A", currency: "USD", created_at: "2026-10-21T00:00:00Z" });
const workflow = (id = "workflow-A", workspace_id = workspaceA, version = 1) => ({ id, workspace_id, name: "Recurring work", description: "Prepare a fictional weekly internal report.", hours_per_occurrence: 0.25, occurrences_per_month: 4, hourly_cost: 20, current_tools: "", pain_points: "", risk: "unknown", data_availability: "unknown", is_sample: false, baseline_version: version, analysis_status: "not_analyzed", created_at: "2026-10-21T00:00:00Z", updated_at: "2026-10-21T00:00:00Z" } as const);
const draft = { name: "Recurring work", description: "Prepare a fictional weekly internal report.", hours: 0.5, frequency: 4, hourlyCost: 20 };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((fn) => { resolve = fn; }); return { promise, resolve }; }
const settle = () => new Promise((resolve) => setTimeout(resolve, 10));
class FakeAuth implements AuthPort {
  current: AccountSession | null = session();
  listener?: (event: string, value: AccountSession | null) => void;
  restore?: ReturnType<typeof deferred<{ data: { session: AccountSession | null }; error: unknown }>>;
  logout?: ReturnType<typeof deferred<{ error: unknown }>>;
  async getSession() { return this.restore ? this.restore.promise : { data: { session: this.current }, error: null }; }
  async signInWithPassword(): ReturnType<AuthPort["signInWithPassword"]> { this.emit(session()); return { data: { session: this.current }, error: null }; }
  async signOut(input: { scope: "local" }) { assert.equal(input.scope, "local"); if (this.logout) return this.logout.promise; this.emit(null); return { error: null }; }
  onAuthStateChange(listener: (event: string, value: AccountSession | null) => void) { this.listener = listener; return { data: { subscription: { unsubscribe: () => { this.listener = undefined; } } } }; }
  emit(value: AccountSession | null) { this.current = value; this.listener?.(value ? "SIGNED_IN" : "SIGNED_OUT", value); }
}
function setup(fetcher: typeof fetch) { const auth = new FakeAuth(); const store = new AccountStore(config, () => auth, fetcher); const stop = store.start(); return { auth, store, stop }; }
const list = (items: unknown[], cursor: string | null = null) => ({ items, next_cursor: cursor });

test("public configuration rejects missing/unsafe settings and privileged keys without exposing values", () => {
  assert.equal(config.config?.apiUrl, "http://127.0.0.1:8000");
  assert.equal(accountConfiguration({}).config, null);
  const result = accountConfiguration({ NEXT_PUBLIC_SUPABASE_URL: "https://user:private-password@host.test", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_private-value", NEXT_PUBLIC_GAINVERA_API_URL: "http://remote.test" });
  assert.equal(result.config, null); assert.doesNotMatch(JSON.stringify(result), /private-password|private-value/);
});
test("restoration cannot overwrite a newer auth event; SDK refresh supplies a fresh bearer without clearing pages", async () => {
  const auth = new FakeAuth(); const restored = deferred<{ data: { session: AccountSession | null }; error: unknown }>(); auth.restore = restored;
  const tokens: string[] = [];
  const store = new AccountStore(config, () => auth, async (_input, init) => { tokens.push(new Headers(init?.headers).get("Authorization")!); return json(list([workspace(workspaceB)])); });
  const stop = store.start(); auth.restore = undefined; auth.emit(session("B")); await settle();
  restored.resolve({ data: { session: session("A") }, error: null }); await settle(); assert.equal(store.getSnapshot().user?.id, "B");
  const generation = store.getSnapshot().generation;
  auth.emit(session("B", "renewed-B")); await store.loadWorkspaces();
  assert.equal(store.getSnapshot().generation, generation); assert.deepEqual(tokens, ["Bearer token-B", "Bearer renewed-B"]);
  stop();
});
test("sign-out clears all account data before network completion and ignores late responses even when fetch ignores abort", async () => {
  const delayed = deferred<Response>(); let requested = false;
  const { auth, store, stop } = setup(async () => { requested = true; return delayed.promise; });
  await settle(); assert.ok(requested); auth.logout = deferred();
  const out = store.signOut(); assert.equal(store.getSnapshot().phase, "signed_out"); assert.deepEqual(store.getSnapshot().workspaces.items, []);
  delayed.resolve(json(list([workspace()]))); await settle(); assert.deepEqual(store.getSnapshot().workspaces.items, []);
  auth.logout.resolve({ error: null }); await out; assert.equal(store.getSnapshot().authBusy, false); stop();
});
test("account switching suppresses a previous account's delayed 401 as well as its data", async () => {
  const first = deferred<Response>(); let calls = 0;
  const { auth, store, stop } = setup(async () => ++calls === 1 ? first.promise : json(list([workspace(workspaceB)])));
  await settle(); auth.emit(session("B")); await settle();
  first.resolve(json({ error: { code: "unauthenticated", message: "Expired", request_id: "ce5d45af-fd7d-47ed-af84-d410385ebc31", details: [], retryable: false } }, 401));
  await settle(); assert.equal(store.getSnapshot().user?.id, "B"); assert.equal(store.getSnapshot().workspaces.items[0].id, workspaceB); stop();
});
test("a current 401 clears state, retains request ID and requires sign-in without replay", async () => {
  let calls = 0;
  const { store, stop } = setup(async () => { calls++; return json({ error: { code: "unauthenticated", message: "Expired", request_id: "ce5d45af-fd7d-47ed-af84-d410385ebc31", details: [], retryable: false } }, 401); });
  await settle(); assert.equal(store.getSnapshot().phase, "signed_out"); assert.match(store.getSnapshot().authMessage, /ce5d45af/); assert.equal(calls, 1); stop();
});
test("workspace pages retain opaque cursors, merge duplicate records and reset on page-size change", async () => {
  const urls: string[] = [];
  const { store, stop } = setup(async (input) => { const url = String(input); urls.push(url); return json(url.includes("cursor=") ? list([workspace(), workspace("second")]) : list([workspace()], "opaque/+ cursor")); });
  await settle(); await store.loadWorkspaces(true);
  assert.deepEqual(store.getSnapshot().workspaces.items.map((item) => item.id), [workspaceA, "second"]);
  assert.match(urls[1], /cursor=opaque%2F%2B\+cursor/);
  store.setPageSize(1); await settle(); assert.equal(store.getSnapshot().workspaceId, null); assert.match(urls.at(-1)!, /limit=1/); stop();
});
test("workspace changes hide old workflows and discard delayed page results", async () => {
  const delayed = deferred<Response>();
  const { store, stop } = setup(async (input) => {
    const url = String(input); if (url.includes("/workspaces")) return json(list([workspace(), workspace(workspaceB)]));
    return url.includes(workspaceA) ? delayed.promise : json(list([workflow("B", workspaceB)]));
  });
  await settle(); store.selectWorkspace(workspaceA); store.selectWorkspace(workspaceB); await settle(); delayed.resolve(json(list([workflow()]))); await settle();
  assert.equal(store.getSnapshot().workflows.items[0].id, "B"); stop();
});
test("write requests whitelist create/edit fields, use expected versions, and accept only confirmed transport 204 deletes", async () => {
  const writes: { method: string; body: unknown }[] = [];
  const { store, stop } = setup(async (input, init) => {
    const url = String(input), method = init?.method ?? "GET";
    if (method === "GET") return json(url.includes("/workspaces") ? list([workspace()]) : list([workflow()]));
    writes.push({ method, body: init?.body ? JSON.parse(String(init.body)) : null });
    return method === "DELETE" ? new Response(null, { status: 204 }) : json(workflow("workflow-A", workspaceA, 2));
  });
  await settle(); store.selectWorkspace(workspaceA); await settle();
  await store.saveWorkflow(draft, workflow()); await store.deleteWorkflow("workflow-A");
  assert.deepEqual(writes[0], { method: "PATCH", body: { baseline_version: 1, hours_per_occurrence: 0.5 } });
  assert.equal(writes[1].method, "DELETE"); assert.deepEqual(store.getSnapshot().workflows.items, []); stop();
});
test("409 leaves existing data unchanged, supports explicit latest-record reads and never retries the write", async () => {
  let patches = 0;
  const { store, stop } = setup(async (input, init) => {
    const url = String(input);
    if (init?.method === "PATCH") { patches++; return json({ error: { code: "conflict", message: "Stale", request_id: "ce5d45af-fd7d-47ed-af84-d410385ebc31", details: [], retryable: false } }, 409); }
    return json(url.includes("/workspaces") ? list([workspace()]) : url.includes("/workflows/") ? workflow("workflow-A", workspaceA, 2) : list([workflow()]));
  });
  await settle(); store.selectWorkspace(workspaceA); await settle();
  await assert.rejects(store.saveWorkflow(draft, workflow()), (error) => error instanceof ApiClientError && error.status === 409);
  assert.equal((await store.readWorkflow("workflow-A")).baseline_version, 2); assert.equal(patches, 1); assert.equal(store.getSnapshot().workflows.items[0].baseline_version, 1); stop();
});
test("network/dependency failures stay failures and failed delete retains the record", async () => {
  let failList = false;
  const { store, stop } = setup(async (input, init) => {
    if (init?.method === "DELETE") return new Response(null, { status: 200 });
    if (failList) throw new Error("private raw error");
    return json(String(input).includes("/workspaces") ? list([workspace()]) : list([workflow()]));
  });
  await settle(); store.selectWorkspace(workspaceA); await settle();
  await assert.rejects(store.deleteWorkflow("workflow-A"), ApiClientError); assert.equal(store.getSnapshot().workflows.items.length, 1);
  failList = true; await store.loadWorkflows(); assert.equal(store.getSnapshot().workflows.loaded, false); assert.ok(store.getSnapshot().workflows.error instanceof ApiClientError); stop();
});
test("a changed account during token lookup sends no request with the new user's token", async () => {
  const auth = new FakeAuth(); let calls = 0;
  const store = new AccountStore(config, () => auth, async () => { calls++; return json(list([workspace()])); });
  const stop = store.start(); await settle(); const oldCalls = calls;
  auth.current = session("B"); await store.loadWorkspaces(); assert.equal(calls, oldCalls); assert.equal(store.getSnapshot().phase, "signed_out"); stop();
});
test("no configuration makes no auth or API calls and closed scopes cannot read records", async () => {
  const store = new AccountStore(accountConfiguration({}), () => { throw new Error("must not initialize"); });
  const stop = store.start(); assert.equal(store.getSnapshot().phase, "unavailable"); await assert.rejects(store.readWorkflow("id"), AccountChangedError); stop();
});
test("a pending write from an earlier account cannot populate a newly signed-in account", async () => {
  const pending = deferred<Response>();
  const { auth, store, stop } = setup(async (input, init) => init?.method === "POST" ? pending.promise : json(String(input).includes("/workspaces") ? list([workspace()]) : list([])));
  await settle(); store.selectWorkspace(workspaceA); await settle();
  const save = store.saveWorkflow(draft); const rejected = assert.rejects(save, AccountChangedError);
  auth.emit(session("B")); await settle(); pending.resolve(json(workflow())); await rejected;
  assert.equal(store.getSnapshot().user?.id, "B"); assert.deepEqual(store.getSnapshot().workflows.items, []); stop();
});
test("sign-in failures use safe text and sign-out failure clears data without claiming SDK logout succeeded", async () => {
  const auth = new FakeAuth(); auth.current = null;
  auth.signInWithPassword = async () => ({ data: { session: null }, error: new Error("private provider details") });
  const store = new AccountStore(config, () => auth, async () => json(list([]))); const stop = store.start(); await settle();
  await store.signIn("test@example.test", "not-printed"); assert.equal(store.getSnapshot().phase, "signed_out"); assert.doesNotMatch(store.getSnapshot().authMessage, /private provider|not-printed/);
  auth.emit(session()); await settle(); auth.logout = deferred(); const out = store.signOut(); auth.logout.resolve({ error: new Error("private") }); await out;
  assert.equal(store.getSnapshot().signOutFailed, true); assert.deepEqual(store.getSnapshot().workspaces.items, []); assert.match(store.getSnapshot().authMessage, /could not finish/); stop();
});
test("late list pages cannot resurrect a deleted workflow or discard a newly created workflow", async () => {
  const oldPage = deferred<Response>(); let workflowReads = 0;
  const { store, stop } = setup(async (input, init) => {
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    if (String(input).includes("/workspaces")) return json(list([workspace()]));
    return ++workflowReads === 1 ? json(list([workflow()], "next")) : oldPage.promise;
  });
  await settle(); store.selectWorkspace(workspaceA); await settle();
  const more = store.loadWorkflows(true); await store.deleteWorkflow("workflow-A");
  oldPage.resolve(json(list([]))); await more;
  assert.deepEqual(store.getSnapshot().workflows.items, []); assert.equal(store.getSnapshot().workflows.loading, false); stop();

  const oldEmptyList = deferred<Response>();
  const created = setup(async (input, init) => init?.method === "POST" ? json(workflow()) : String(input).includes("/workspaces") ? json(list([workspace()])) : oldEmptyList.promise);
  await settle(); created.store.selectWorkspace(workspaceA); await created.store.saveWorkflow(draft);
  oldEmptyList.resolve(json(list([]))); await settle();
  assert.equal(created.store.getSnapshot().workflows.items[0].id, "workflow-A"); created.stop();
});
