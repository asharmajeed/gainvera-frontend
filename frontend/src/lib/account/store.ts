import { ApiClientError, createGainveraHttpClient, workflowToCreateRequest, workflowToPatchRequest } from "../api";
import type { ApiCallOptions, ApiResult, ApiWorkflow, ApiWorkspace, WorkflowDraft } from "../api";
import type { AccountConfiguration } from "./config";

export interface AccountSession { user: { id: string; email?: string }; access_token: string }
export interface AuthPort {
  getSession(): Promise<{ data: { session: AccountSession | null }; error: unknown }>;
  signInWithPassword(input: { email: string; password: string }): Promise<{ data: { session: AccountSession | null }; error: unknown }>;
  signOut(input: { scope: "local" }): Promise<{ error: unknown }>;
  onAuthStateChange(callback: (event: string, session: AccountSession | null) => void): { data: { subscription: { unsubscribe(): void } } };
}
type Api = ReturnType<typeof createGainveraHttpClient>;
interface Page<T> { items: T[]; cursor: string | null; loaded: boolean; loading: boolean; error: unknown }
const page = <T>(): Page<T> => ({ items: [], cursor: null, loaded: false, loading: false, error: null });
export interface AccountState {
  phase: "restoring" | "unavailable" | "signed_out" | "signed_in";
  user: AccountSession["user"] | null;
  generation: number;
  authBusy: boolean;
  authMessage: string;
  signOutFailed: boolean;
  workspaces: Page<ApiWorkspace>;
  workspaceId: string | null;
  workflows: Page<ApiWorkflow>;
  detail: ApiWorkflow | null;
  busy: boolean;
  error: unknown;
  notice: string;
  pageSize: number;
  dataRevision: number;
}
const emptyState = (): AccountState => ({ phase: "restoring", user: null, generation: 0, authBusy: false, authMessage: "", signOutFailed: false,
  workspaces: page(), workspaceId: null, workflows: page(), detail: null, busy: false, error: null, notice: "", pageSize: 10, dataRevision: 0 });
const serverState = emptyState();
export class AccountChangedError extends Error { constructor() { super("Session or workspace changed. No result was displayed."); } }
function merge<T extends { id: string }>(old: T[], incoming: T[]) {
  return [...new Map([...old, ...incoming].map((item) => [item.id, item])).values()];
}

/** Account/workspace generations protect reads AND errors, even if fetch ignores abort. */
export class AccountStore {
  private state = emptyState();
  private listeners = new Set<() => void>();
  private auth?: AuthPort;
  private api?: Api;
  private controllers = new Set<AbortController>();
  private scope = 0;
  private reads = new Map<string, number>();
  private nextRead = 0;
  private authRevision = 0;
  private stopped = true;
  private blocked = false;
  private unsubscribe?: () => void;
  constructor(readonly configuration: AccountConfiguration, private authFactory: () => AuthPort, private fetcher?: typeof fetch) {}
  getSnapshot = () => this.state;
  getServerSnapshot = () => serverState;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  blockOrigin() { this.clear("unavailable", "Use http://localhost:3100/ecommerce/account for real account requests. Port 3101 is outside the backend CORS allowlist."); }
  private set(patch: Partial<AccountState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach((fn) => fn()); }
  private invalidate() { this.scope++; this.controllers.forEach((item) => item.abort()); this.controllers.clear(); this.reads.clear(); }
  private clear(phase: AccountState["phase"], message = "") {
    this.invalidate(); this.api = undefined;
    const generation = this.state.generation + 1;
    this.state = { ...emptyState(), phase, generation, authMessage: message };
    this.listeners.forEach((fn) => fn());
  }
  start() {
    this.stopped = false;
    if (!this.configuration.config) { this.clear("unavailable"); return () => this.stop(); }
    try {
      this.auth = this.authFactory();
      const { data } = this.auth.onAuthStateChange((_event, session) => {
        if (this.stopped) return;
        this.authRevision++;
        if (this.blocked) return;
        this.accept(session);
      });
      this.unsubscribe = () => data.subscription.unsubscribe();
      const revision = this.authRevision;
      void this.auth.getSession().then(({ data, error }) => {
        if (this.stopped || revision !== this.authRevision || this.blocked) return;
        if (error) this.clear("signed_out", "Session restoration failed. Sign in again when the authentication service is available.");
        else this.accept(data.session);
      }).catch(() => { if (!this.stopped && revision === this.authRevision) this.clear("signed_out", "Session restoration failed. Try signing in again."); });
    } catch { this.clear("unavailable", "Authentication could not be initialized. Check public configuration and browser storage access."); }
    return () => this.stop();
  }
  private stop() { this.stopped = true; this.authRevision++; this.unsubscribe?.(); this.invalidate(); }
  private accept(session: AccountSession | null) {
    if (!session) { this.clear("signed_out"); return; }
    if (this.state.phase === "signed_in" && this.state.user?.id === session.user.id) return; // SDK refresh/focus events keep current pages.
    this.clear("signed_in"); this.set({ user: { id: session.user.id, email: session.user.email } });
    const generation = this.state.generation, userId = session.user.id;
    this.api = createGainveraHttpClient({ baseUrl: this.configuration.config!.apiUrl, fetch: this.fetcher,
      getAccessToken: async () => {
        const result = await this.auth!.getSession(); // SDK renews expired tokens; backend verifies each access token.
        if (result.error || this.blocked || this.stopped || generation !== this.state.generation || result.data.session?.user.id !== userId)
          throw new AccountChangedError();
        return result.data.session.access_token;
      } });
    // Never perform awaited SDK operations inside the synchronous auth callback.
    queueMicrotask(() => { if (!this.stopped && generation === this.state.generation) void this.loadWorkspaces(); });
  }
  async signIn(email: string, password: string) {
    if (!this.auth || this.state.authBusy) return;
    this.blocked = false; this.clear("signed_out"); this.set({ authBusy: true });
    const revision = ++this.authRevision;
    try {
      const { data, error } = await this.auth.signInWithPassword({ email: email.trim(), password });
      if (this.stopped) return;
      // The SDK may have emitted SIGNED_IN already. Never restore stale sign-in output after sign-out.
      if (this.blocked) return;
      if (error || !data.session) {
        if (this.state.phase !== "signed_in") this.set({ authMessage: "Sign-in failed. Check your email/password, email confirmation and connection, then try again." });
      } else if (revision === this.authRevision || this.state.user?.id === data.session.user.id) this.accept(data.session);
    } catch { if (!this.stopped && !this.blocked) this.set({ authMessage: "The authentication service could not be reached. Try again later." }); }
    finally { if (!this.stopped) this.set({ authBusy: false }); }
  }
  async signOut() {
    if (!this.auth || this.state.authBusy) return;
    this.blocked = true; this.authRevision++;
    this.clear("signed_out", "Signing out; account data has been cleared."); this.set({ authBusy: true });
    try {
      const { error } = await this.auth.signOut({ scope: "local" });
      if (this.stopped) return;
      this.set({ authMessage: error ? "Sign-out could not finish. Data is cleared here; retry sign-out before leaving a shared browser." : "Signed out of this browser session.", signOutFailed: !!error });
    } catch { if (!this.stopped) this.set({ authMessage: "Sign-out could not finish. Retry before leaving a shared browser.", signOutFailed: true }); }
    finally { if (!this.stopped) this.set({ authBusy: false }); }
  }
  private fail(error: unknown) {
    if (error instanceof ApiClientError && (error.status === 401 || error.kind === "auth")) {
      this.blocked = true; this.clear("signed_out", `Your session expired or was rejected. Account data has been cleared. Sign in again; the failed request was not replayed.${error.requestId ? ` Request ID: ${error.requestId}.` : ""}`);
    }
  }
  private async request<T>(operation: (api: Api, options: ApiCallOptions) => Promise<ApiResult<T>>, guard: () => boolean = () => true, signal?: AbortSignal) {
    if (!this.api || this.blocked || this.stopped || !guard() || signal?.aborted) throw new AccountChangedError();
    const scope = this.scope, generation = this.state.generation;
    const controller = new AbortController(); this.controllers.add(controller);
    const abort = () => controller.abort(); signal?.addEventListener("abort", abort, { once: true });
    try {
      const result = await operation(this.api, { signal: controller.signal, requestId: crypto.randomUUID() });
      if (scope !== this.scope || generation !== this.state.generation || this.stopped || !guard() || signal?.aborted) throw new AccountChangedError();
      return result.body;
    } catch (error) {
      if (scope !== this.scope || generation !== this.state.generation || this.stopped || !guard() || signal?.aborted) throw new AccountChangedError();
      this.fail(error); throw error;
    } finally { signal?.removeEventListener("abort", abort); this.controllers.delete(controller); }
  }
  /** Result controllers reuse the same token supplier and failure handling. No token is exposed. */
  requestResults<T>(operation: (api: Api, options: ApiCallOptions) => Promise<ApiResult<T>>, guard: () => boolean, signal: AbortSignal) {
    return this.request(operation, guard, signal);
  }
  acceptResultWorkflow(record: ApiWorkflow) {
    if (record.workspace_id !== this.state.workspaceId || this.state.detail?.id !== record.id) return;
    this.set({ detail: record, workflows: { ...this.state.workflows, items: this.state.workflows.items.map((item) => item.id === record.id ? record : item) } });
  }
  resultsChanged() { this.set({ dataRevision: this.state.dataRevision + 1 }); }
  async loadWorkspaces(more = false) {
    if (!this.api || (more && (!this.state.workspaces.cursor || this.state.workspaces.loading))) return;
    if (!more) { this.invalidate(); this.set({ workspaceId: null, workflows: page(), detail: null }); }
    const sequence = ++this.nextRead; this.reads.set("workspaces", sequence);
    const current = this.state.workspaces, generation = this.state.generation;
    this.set({ workspaces: { ...(more ? current : page<ApiWorkspace>()), loading: true } });
    try {
      const result = await this.request((api, options) => api.listWorkspaces({ ...options, limit: this.state.pageSize, cursor: more ? current.cursor! : undefined }));
      if (this.reads.get("workspaces") !== sequence || generation !== this.state.generation) return;
      this.set({ workspaces: { items: merge(more ? current.items : [], result.items), cursor: result.next_cursor, loaded: true, loading: false, error: null } });
    } catch (error) {
      if (error instanceof AccountChangedError || generation !== this.state.generation || this.reads.get("workspaces") !== sequence) return;
      this.set({ workspaces: { ...this.state.workspaces, loading: false, error } });
    }
  }
  selectWorkspace(id: string) {
    if (this.state.busy || !this.state.workspaces.items.some((item) => item.id === id)) return;
    this.invalidate(); this.set({ workspaceId: id, workflows: page(), detail: null, error: null, notice: "" });
    // A workspace switch also cancels pending workspace-page requests. Keep loaded pages, release their spinner.
    this.set({ workspaces: { ...this.state.workspaces, loading: false } });
    void this.loadWorkflows();
  }
  setPageSize(size: number) {
    if (![1, 10, 25, 50].includes(size) || this.state.busy) return;
    this.invalidate(); this.set({ pageSize: size, workspaces: page(), workspaceId: null, workflows: page(), detail: null, error: null, notice: "" });
    void this.loadWorkspaces();
  }
  async loadWorkflows(more = false) {
    const id = this.state.workspaceId;
    if (!id || !this.api || (more && (!this.state.workflows.cursor || this.state.workflows.loading))) return;
    const sequence = ++this.nextRead; this.reads.set("workflows", sequence);
    const current = this.state.workflows, generation = this.state.generation;
    this.set({ workflows: { ...(more ? current : page<ApiWorkflow>()), loading: true }, detail: null });
    try {
      const result = await this.request((api, options) => api.listWorkflows(id, { ...options, limit: this.state.pageSize, cursor: more ? current.cursor! : undefined }));
      if (this.reads.get("workflows") !== sequence || generation !== this.state.generation) return;
      if (result.items.some((item) => item.workspace_id !== id)) throw new ApiClientError("protocol", "workspace_mismatch", "The response does not match the selected workspace.");
      this.set({ workflows: { items: merge(more ? current.items : [], result.items), cursor: result.next_cursor, loaded: true, loading: false, error: null } });
    } catch (error) {
      if (error instanceof AccountChangedError || generation !== this.state.generation || this.reads.get("workflows") !== sequence) return;
      this.set({ workflows: { ...this.state.workflows, loading: false, error } });
    }
  }
  async readWorkflow(id: string) {
    const workspaceId = this.state.workspaceId;
    const result = await this.request((api, options) => api.getWorkflow(id, options));
    if (result.workspace_id !== workspaceId) throw new ApiClientError("protocol", "workspace_mismatch", "The response does not match the selected workspace.");
    return result;
  }
  async openWorkflow(id: string) {
    const sequence = ++this.nextRead; this.reads.set("detail", sequence);
    this.set({ detail: null, error: null, notice: "Loading saved workflow…" });
    try { const detail = await this.readWorkflow(id); if (this.reads.get("detail") === sequence) this.set({ detail, notice: "" }); }
    catch (error) { if (!(error instanceof AccountChangedError) && this.reads.get("detail") === sequence) this.set({ error, notice: "" }); }
  }
  closeDetail() { this.reads.set("detail", ++this.nextRead); this.set({ detail: null, notice: "", dataRevision: this.state.dataRevision + 1 }); }
  private async write<T>(operation: () => Promise<T>, notice: string) {
    if (this.state.busy) throw new Error("Wait for the current change to finish.");
    const scope = this.scope, generation = this.state.generation;
    this.set({ busy: true, error: null, notice: "" });
    try {
      const result = await operation();
      if (scope !== this.scope || generation !== this.state.generation) throw new AccountChangedError();
      this.set({ notice }); return result;
    } finally { if (scope === this.scope && generation === this.state.generation) this.set({ busy: false }); }
  }
  async createWorkspace(name: string) {
    const generation = this.state.generation;
    const result = await this.write(() => this.request((api, options) => api.createWorkspace({ name, currency: "USD" }, options)), "Workspace saved to your account.");
    if (generation !== this.state.generation) throw new AccountChangedError();
    // Reload ordered first page; include the new workspace explicitly so it can be selected even beyond that page.
    const read = this.loadWorkspaces(), scope = this.scope;
    await read;
    if (generation !== this.state.generation || scope !== this.scope || this.state.phase !== "signed_in") throw new AccountChangedError();
    this.set({ workspaces: { ...this.state.workspaces, items: merge(this.state.workspaces.items, [result]) } }); this.selectWorkspace(result.id);
  }
  async saveWorkflow(draft: WorkflowDraft, original?: ApiWorkflow) {
    const generation = this.state.generation, scope = this.scope;
    const workspaceId = this.state.workspaceId;
    if (!workspaceId || (original && original.workspace_id !== workspaceId)) throw new AccountChangedError();
    const patch = original ? workflowToPatchRequest(draft, original) : null;
    if (original && !patch) { this.set({ notice: "No changes to save." }); return; }
    const result = await this.write(() => this.request((api, options) => original
      ? api.patchWorkflow(original.id, patch!, options)
      : api.createWorkflow(workflowToCreateRequest(draft, workspaceId), options)), "Workflow saved. Open it to analyze the current baseline.");
    if (generation !== this.state.generation || scope !== this.scope) throw new AccountChangedError();
    this.reads.set("workflows", ++this.nextRead); this.reads.set("detail", ++this.nextRead);
    this.set({ detail: null, workflows: { ...this.state.workflows, loading: false, items: merge(this.state.workflows.items, [result]) } });
    this.resultsChanged();
  }
  async deleteWorkflow(id: string) {
    const generation = this.state.generation, scope = this.scope;
    await this.write(() => this.request((api, options) => api.deleteWorkflow(id, options)), "Workflow deleted from your account, including its history/results.");
    if (generation !== this.state.generation || scope !== this.scope) throw new AccountChangedError();
    this.reads.set("workflows", ++this.nextRead); this.reads.set("detail", ++this.nextRead);
    this.set({ detail: null, workflows: { ...this.state.workflows, loading: false, items: this.state.workflows.items.filter((item) => item.id !== id) } });
    this.resultsChanged();
  }
}
