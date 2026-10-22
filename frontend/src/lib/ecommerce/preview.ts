import {
  createDevelopmentFixtureSource,
  workflowToCreateRequest,
  workflowToPatchRequest,
  workspaceCreateBody,
} from "../api";
import type {
  ApiAnalysis, ApiMeasurement, ApiScenario, ApiWorkflow, ApiWorkspace, WorkflowDraft,
} from "../api";
import { storeExamples } from "./examples";
import type { LocalScenario } from "./results";

/** In-memory preview state only. This is not an API response or authenticated store. */
export interface PreviewState {
  workspaces: ApiWorkspace[];
  selectedWorkspaceId: string;
  workflows: ApiWorkflow[];
  baselines: ApiWorkflow[];
  analyses: ApiAnalysis[];
  scenarios: ApiScenario[];
  measurements: ApiMeasurement[];
  scenarioPreviews: LocalScenario[];
  exampleWorkspaceIds: string[];
}
export class PreviewStateError extends Error {
  readonly name = "PreviewStateError";
  constructor(readonly code: "workspace_missing" | "workflow_missing" | "stale_version", message: string) {
    super(message);
  }
}
const now = () => new Date().toISOString();

export function createPreviewState(): PreviewState {
  const seed = createDevelopmentFixtureSource({ mode: "development_fixture" }).getSnapshot();
  return loadPreviewExamples({
    workspaces: [seed.workspace], selectedWorkspaceId: seed.workspace.id,
    workflows: [], baselines: [], analyses: [], scenarios: [], measurements: [], scenarioPreviews: [], exampleWorkspaceIds: [],
  });
}

function requireWorkspace(state: PreviewState, id: string) {
  const workspace = state.workspaces.find((item) => item.id === id);
  if (!workspace) throw new PreviewStateError("workspace_missing", "Select a preview workspace before continuing.");
  return workspace;
}
function requireWorkflow(state: PreviewState, id: string) {
  const workflow = state.workflows.find((item) => item.id === id && item.workspace_id === state.selectedWorkspaceId);
  if (!workflow) throw new PreviewStateError("workflow_missing", "This workflow is not in the selected preview workspace.");
  return workflow;
}
export function selectPreviewWorkspace(state: PreviewState, id: string): PreviewState {
  requireWorkspace(state, id);
  return { ...state, selectedWorkspaceId: id };
}
export function addPreviewWorkspace(state: PreviewState, name: string): PreviewState {
  const body = workspaceCreateBody({ name, currency: "USD" });
  const workspace: ApiWorkspace = {
    ...body, id: crypto.randomUUID(), owner_id: state.workspaces[0].owner_id, created_at: now(),
  };
  return { ...state, workspaces: [...state.workspaces, workspace], selectedWorkspaceId: workspace.id };
}
export function addPreviewWorkflow(state: PreviewState, draft: WorkflowDraft): PreviewState {
  requireWorkspace(state, state.selectedWorkspaceId);
  const body = workflowToCreateRequest({ ...draft, sample: true }, state.selectedWorkspaceId);
  const timestamp = now();
  const workflow: ApiWorkflow = {
    ...body, id: crypto.randomUUID(), baseline_version: 1, analysis_status: "not_analyzed",
    created_at: timestamp, updated_at: timestamp,
  };
  return { ...state, workflows: [...state.workflows, workflow], baselines: [...state.baselines, structuredClone(workflow)] };
}
export function loadPreviewExamples(state: PreviewState): PreviewState {
  requireWorkspace(state, state.selectedWorkspaceId);
  if (state.exampleWorkspaceIds.includes(state.selectedWorkspaceId)) return state;
  const populated = storeExamples.reduce((current, example) => addPreviewWorkflow(current, example.draft), state);
  return { ...populated, exampleWorkspaceIds: [...populated.exampleWorkspaceIds, state.selectedWorkspaceId] };
}
export function editPreviewWorkflow(state: PreviewState, id: string, expectedVersion: number, draft: WorkflowDraft): PreviewState {
  const current = requireWorkflow(state, id);
  if (current.baseline_version !== expectedVersion)
    throw new PreviewStateError("stale_version", "This baseline changed. Reopen the workflow and reconcile your edits.");
  const patch = workflowToPatchRequest({ ...draft, sample: true }, current);
  if (!patch) return state;
  const updated: ApiWorkflow = {
    ...current, ...patch, baseline_version: current.baseline_version + 1,
    analysis_status: "needs_reanalysis", updated_at: now(),
  };
  return {
    ...state,
    workflows: state.workflows.map((item) => item.id === id ? updated : item),
    baselines: [...state.baselines, structuredClone(updated)],
    // Historical results stay on their original version; selectors hide them as active.
  };
}
export function deletePreviewWorkflow(state: PreviewState, id: string): PreviewState {
  requireWorkflow(state, id);
  return {
    ...state,
    workflows: state.workflows.filter((item) => item.id !== id),
    baselines: state.baselines.filter((item) => item.id !== id),
    analyses: state.analyses.filter((item) => item.workflow_id !== id),
    scenarios: state.scenarios.filter((item) => item.workflow_id !== id),
    scenarioPreviews: state.scenarioPreviews.filter((item) => item.workflowId !== id),
    measurements: state.measurements.filter((item) => item.workflow_id !== id),
  };
}
export function currentPreviewAnalysis(state: PreviewState, workflow: ApiWorkflow) {
  if (workflow.analysis_status !== "analyzed") return null;
  return state.analyses.find((item) => item.workflow_id === workflow.id && item.baseline_version === workflow.baseline_version) ?? null;
}
export function currentPreviewScenario(state: PreviewState, workflow: ApiWorkflow) {
  const analysis = currentPreviewAnalysis(state, workflow);
  if (!analysis) return null;
  return state.scenarios.find((item) => item.workflow_id === workflow.id &&
    item.baseline_version === workflow.baseline_version && item.analysis_id === analysis.id) ?? null;
}
export function baselineForMeasurement(state: PreviewState, measurement: ApiMeasurement) {
  return state.baselines.find((item) => item.id === measurement.workflow_id && item.baseline_version === measurement.baseline_version) ?? null;
}
