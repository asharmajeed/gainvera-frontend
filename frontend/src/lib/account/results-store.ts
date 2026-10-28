import { ApiClientError } from "../api";
import type { ApiAnalysisState, ApiCallOptions, ApiDashboard, ApiMeasurement, ApiMeasurementInput, ApiPage, ApiReportDownload, ApiResult, ApiScenarioSaveInput, ApiScenarioState, ApiWorkflow, ApiWorkflowBaseline, createGainveraHttpClient } from "../api";
import { AccountChangedError, AccountStore } from "./store";
type Api = ReturnType<typeof createGainveraHttpClient>;
export interface Resource<T> { data: T | null; loading: boolean; error: unknown }
export interface ResultPage<T> { items: T[]; cursor: string | null; loaded: boolean; loading: boolean; error: unknown }
const resource = <T>(): Resource<T> => ({ data: null, loading: false, error: null });
const page = <T>(): ResultPage<T> => ({ items: [], cursor: null, loaded: false, loading: false, error: null });
type Operation<T> = (api: Api, options: ApiCallOptions) => Promise<ApiResult<T>>;

class ProtectedStore<State> {
  private listeners = new Set<() => void>();
  protected stopped = true;
  private controllers = new Set<AbortController>();
  protected sequences = new Map<string, number>();
  private nextRead = 0;
  private generation: number;
  protected workspaceId: string;
  private initial: State;
  constructor(protected parent: AccountStore, protected state: State, private workflowId?: string) {
    this.initial = state;
    this.generation = parent.getSnapshot().generation;
    this.workspaceId = parent.getSnapshot().workspaceId!;
  }
  getSnapshot = () => this.state;
  getServerSnapshot = () => this.initial;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  protected set(patch: Partial<State>) { this.state = { ...this.state, ...patch }; this.listeners.forEach((fn) => fn()); }
  protected current = () => !this.stopped && this.parent.getSnapshot().generation === this.generation && this.parent.getSnapshot().workspaceId === this.workspaceId &&
    (!this.workflowId || this.parent.getSnapshot().detail?.id === this.workflowId);
  protected begin(key: string) { const sequence = ++this.nextRead; this.sequences.set(key, sequence); return sequence; }
  protected active(key: string, sequence: number) { return this.current() && this.sequences.get(key) === sequence; }
  protected async call<T>(operation: Operation<T>, extra: () => boolean = () => true) {
    const controller = new AbortController(); this.controllers.add(controller);
    try { return await this.parent.requestResults(operation, () => this.current() && extra(), controller.signal); }
    finally { this.controllers.delete(controller); }
  }
  stop = () => { this.stopped = true; this.sequences.clear(); this.controllers.forEach((item) => item.abort()); this.controllers.clear(); };
}

export interface WorkspaceResultsState { dashboard: Resource<ApiDashboard>; exporting: boolean; exportError: unknown; exportNotice: string }
export class WorkspaceResultsStore extends ProtectedStore<WorkspaceResultsState> {
  constructor(parent: AccountStore) { super(parent, { dashboard: resource(), exporting: false, exportError: null, exportNotice: "" }); }
  start() { this.stopped = false; void this.refresh(); return this.stop; }
  async refresh() {
    const detailId = this.parent.getSnapshot().detail?.id;
    const sameView = () => this.parent.getSnapshot().detail?.id === detailId;
    const ticket = this.begin("dashboard"); this.set({ dashboard: { ...this.state.dashboard, loading: true, error: null } });
    try {
      const data = await this.call((api, opts) => api.getDashboard(this.workspaceId, opts), sameView);
      if (data.workspace.id !== this.workspaceId) throw new ApiClientError("protocol", "workspace_mismatch", "The dashboard does not match this workspace.");
      if (this.active("dashboard", ticket)) this.set({ dashboard: { data, loading: false, error: null } });
    } catch (error) { if (this.active("dashboard", ticket) && !(error instanceof AccountChangedError)) this.set({ dashboard: { ...this.state.dashboard, loading: false, error } }); }
  }
  async exportReport(deliver: (report: ApiReportDownload) => void) {
    if (this.state.exporting) return;
    const detailId = this.parent.getSnapshot().detail?.id;
    const sameView = () => this.parent.getSnapshot().detail?.id === detailId;
    this.set({ exporting: true, exportError: null, exportNotice: "" });
    try {
      const report = await this.call((api, opts) => api.getReport(this.workspaceId, opts), sameView);
      if (!this.current() || !sameView()) return;
      deliver(report); // Synchronous delivery ONLY after all account/workspace/view guards.
      this.set({ exportNotice: "Authenticated HTML report downloaded. No token was placed in a URL." });
    } catch (error) { if (this.current() && !(error instanceof AccountChangedError)) this.set({ exportError: error }); }
    finally { if (this.current()) this.set({ exporting: false }); }
  }
}

export type ResultMutation = "analysis" | "scenario" | "measurement";
export interface WorkflowResultsState {
  workflow: ApiWorkflow;
  analysis: Resource<ApiAnalysisState>;
  scenario: Resource<ApiScenarioState>;
  baselines: ResultPage<ApiWorkflowBaseline>;
  measurements: ResultPage<ApiMeasurement>;
  comparisons: Resource<ApiDashboard>;
  historicalScenario: Resource<ApiScenarioState>;
  historicalVersion: number | null;
  contextError: unknown;
  operation: ResultMutation | null;
  errors: Record<ResultMutation, unknown>;
  needsRead: Record<ResultMutation, boolean>;
}
export class WorkflowResultsStore extends ProtectedStore<WorkflowResultsState> {
  constructor(parent: AccountStore, workflow: ApiWorkflow) {
    super(parent, { workflow, analysis: resource(), scenario: resource(), baselines: page(), measurements: page(), comparisons: resource(), historicalScenario: resource(), historicalVersion: null,
      contextError: null, operation: null, errors: { analysis: null, scenario: null, measurement: null }, needsRead: { analysis: false, scenario: false, measurement: false } }, workflow.id);
  }
  start() {
    this.stopped = false;
    void this.refreshContext(); void this.loadBaselines(); void this.loadMeasurements(); void this.loadComparisons();
    return this.stop;
  }
  private async read<T>(key: "analysis" | "scenario" | "comparisons", operation: Operation<T>) {
    const ticket = this.begin(key); this.set({ [key]: { ...this.state[key], loading: true, error: null } });
    try {
      const data = await this.call(operation);
      if (!this.active(key, ticket)) return false;
      if (key === "analysis" && (data as ApiAnalysisState).analysis && (data as ApiAnalysisState).analysis!.workflow_id !== this.state.workflow.id) throw new Error("Result mismatch");
      if (key === "scenario" && (data as ApiScenarioState).scenario && (data as ApiScenarioState).scenario!.workflow_id !== this.state.workflow.id) throw new Error("Result mismatch");
      if (key === "comparisons" && (data as ApiDashboard).workspace.id !== this.workspaceId) throw new Error("Result mismatch");
      this.set({ [key]: { data, loading: false, error: null } }); return true;
    } catch (error) {
      if (this.active(key, ticket) && !(error instanceof AccountChangedError)) this.set({ [key]: { ...this.state[key], loading: false, error } });
      return false;
    }
  }
  loadAnalysis = () => this.read("analysis", (api, opts) => api.getAnalysis(this.state.workflow.id, opts));
  loadScenario = () => this.read("scenario", (api, opts) => api.getScenario(this.state.workflow.id, opts));
  loadComparisons = () => this.read("comparisons", (api, opts) => api.getDashboard(this.workspaceId, opts));
  async refreshContext() {
    this.set({ contextError: null });
    const ticket = this.begin("workflow");
    const results = await Promise.allSettled([
      this.call((api, opts) => api.getWorkflow(this.state.workflow.id, opts)), this.loadAnalysis(), this.loadScenario(),
    ]);
    if (!this.current()) return false;
    const workflow = results[0];
    if (workflow.status === "fulfilled" && this.active("workflow", ticket)) {
      if (workflow.value.workspace_id !== this.workspaceId) return false;
      this.set({ workflow: workflow.value }); this.parent.acceptResultWorkflow(workflow.value);
    }
    if (workflow.status === "rejected" && !(workflow.reason instanceof AccountChangedError)) this.set({ contextError: workflow.reason });
    const okay = results.every((item) => item.status === "fulfilled" && item.value !== false);
    if (okay) this.set({ needsRead: { ...this.state.needsRead, analysis: false, scenario: false } });
    return okay;
  }
  private async loadPage<T>(key: "baselines" | "measurements", more: boolean, operation: (cursor: string | undefined) => Operation<ApiPage<T>>, identity: (item: T) => string) {
    const current = this.state[key] as ResultPage<T>;
    if (more && (current.loading || !current.cursor)) return false;
    const ticket = this.begin(key); this.set({ [key]: { ...(more ? current : page<T>()), loading: true } });
    try {
      const result = await this.call(operation(more ? current.cursor! : undefined));
      if (!this.active(key, ticket)) return false;
      if (result.items.some((item) => (item as { workflow_id: string }).workflow_id !== this.state.workflow.id)) throw new Error("Result mismatch");
      if (key === "baselines" && result.items.some((item) => (item as ApiWorkflowBaseline).snapshot.workspace_id !== this.workspaceId)) throw new Error("Result mismatch");
      const items = [...new Map([...(more ? current.items : []), ...result.items].map((item) => [identity(item), item])).values()];
      this.set({ [key]: { items, cursor: result.next_cursor, loaded: true, loading: false, error: null } }); return true;
    } catch (error) { if (this.active(key, ticket) && !(error instanceof AccountChangedError)) this.set({ [key]: { ...this.state[key], loading: false, error } }); return false; }
  }
  loadBaselines(more = false) {
    return this.loadPage("baselines", more, (cursor) => (api, opts) => api.listBaselines(this.state.workflow.id, { ...opts, limit: this.parent.getSnapshot().pageSize, cursor }), (item: ApiWorkflowBaseline) => String(item.baseline_version));
  }
  async loadMeasurements(more = false) {
    return this.loadPage("measurements", more, (cursor) => (api, opts) => api.listMeasurements(this.state.workflow.id, { ...opts, limit: this.parent.getSnapshot().pageSize, cursor }), (item: ApiMeasurement) => item.id);
  }
  async reconcileMeasurement() {
    if (!await this.loadMeasurements()) return false;
    while (this.current() && this.state.measurements.cursor) if (!await this.loadMeasurements(true)) return false;
    if (!this.current()) return false;
    this.set({ needsRead: { ...this.state.needsRead, measurement: false } }); await this.loadComparisons(); return true;
  }
  async loadHistoricalScenario(version: number) {
    const ticket = this.begin("historical"); this.set({ historicalVersion: version, historicalScenario: { data: null, loading: true, error: null } });
    try {
      const data = await this.call((api, opts) => api.getScenario(this.state.workflow.id, { ...opts, baselineVersion: version }));
      if (data.scenario && data.scenario.workflow_id !== this.state.workflow.id) throw new Error("Result mismatch");
      if (this.active("historical", ticket)) this.set({ historicalScenario: { data, loading: false, error: null } });
    } catch (error) { if (this.active("historical", ticket) && !(error instanceof AccountChangedError)) this.set({ historicalScenario: { data: null, loading: false, error } }); }
  }
  private async mutate<T>(kind: ResultMutation, operation: Operation<T>) {
    if (this.state.operation || this.state.needsRead[kind]) throw new ApiClientError("input", "refresh_required", "Wait for the request, or refetch its outcome before another write.");
    this.set({ operation: kind, errors: { ...this.state.errors, [kind]: null } });
    try { return await this.call(operation); }
    catch (error) {
      if (this.current() && !(error instanceof AccountChangedError)) {
        const uncertain = error instanceof ApiClientError && (error.status === 409 || error.kind === "network" || error.kind === "protocol" || Number(error.status) >= 500);
        this.set({ errors: { ...this.state.errors, [kind]: error }, needsRead: { ...this.state.needsRead, [kind]: uncertain } });
      }
      throw error;
    } finally { if (this.current()) this.set({ operation: null }); }
  }
  async analyze() {
    const data = await this.mutate("analysis", (api, opts) => api.analyzeWorkflow(this.state.workflow.id, { baseline_version: this.state.workflow.baseline_version, guidance_preference: "reviewed_playbook" }, opts));
    if (!this.current()) throw new AccountChangedError();
    this.begin("analysis"); this.set({ analysis: { data, loading: false, error: null } });
    this.parent.resultsChanged();
    await Promise.allSettled([this.refreshContext(), this.loadComparisons()]);
    return data;
  }
  async saveScenario(input: ApiScenarioSaveInput) {
    const data = await this.mutate("scenario", (api, opts) => api.saveScenario(this.state.workflow.id, input, opts));
    if (!this.current()) throw new AccountChangedError();
    this.begin("scenario"); this.set({ scenario: { data, loading: false, error: null } });
    this.parent.resultsChanged();
    await Promise.allSettled([this.loadAnalysis(), this.loadComparisons()]); return data;
  }
  async saveMeasurement(input: ApiMeasurementInput) {
    if (!this.state.baselines.items.some((item) => item.baseline_version === input.baseline_version)) throw new ApiClientError("input", "baseline_unavailable", "Load and deliberately select an existing original baseline before saving.");
    const data = await this.mutate("measurement", (api, opts) => api.createMeasurement(this.state.workflow.id, input, opts));
    if (!this.current()) throw new AccountChangedError();
    this.begin("measurements"); // A late pre-insert page cannot hide the new observation.
    this.set({ measurements: { ...this.state.measurements, loading: false, loaded: true, items: [...this.state.measurements.items.filter((item) => item.id !== data.id), data] } });
    this.parent.resultsChanged();
    await this.loadComparisons(); return data;
  }
}
