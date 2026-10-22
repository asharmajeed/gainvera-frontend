import type { ApiAnalysis, ApiMeasurement, ApiScenario, ApiWorkflow, ApiWorkspace } from "./types";
import type { ApiCallOptions, ApiResult, GainveraReadSource } from "./client";

export const DEVELOPMENT_FIXTURE_LABEL =
  "Development fixtures: fictional local data; no database, authentication, ML or AI result.";

const workspace: ApiWorkspace = {
  id: "c0ae0b3a-e90c-443b-bc7e-a6c4275b274a",
  owner_id: "e9035332-d567-4970-a464-107bf4a414b5",
  name: "NovaCart (development fixture)",
  currency: "USD",
  created_at: "2026-10-20T00:00:00Z",
};
const workflow: ApiWorkflow = {
  id: "f1393f14-ee79-4eae-8e31-dff6743aeb38",
  workspace_id: workspace.id,
  name: "Product description drafting (fixture)",
  description: "Draft clothing descriptions from confirmed materials, size and care facts. A person checks every claim before publishing.",
  hours_per_occurrence: 0.25,
  occurrences_per_month: 40,
  hourly_cost: 20,
  current_tools: "Fictional store spreadsheet",
  pain_points: "Repeated drafting and review",
  risk: "unknown",
  data_availability: "unknown",
  is_sample: true,
  baseline_version: 1,
  analysis_status: "not_analyzed",
  created_at: "2026-10-20T00:00:00Z",
  updated_at: "2026-10-20T00:00:00Z",
};
const clarificationWorkflow: ApiWorkflow = {
  ...workflow,
  id: "039c4ccc-c7a2-4d0a-8b2b-e282be82c3b2",
  name: "Unavailable analysis state (fixture)",
  analysis_status: "analyzed",
};
const clarification: ApiAnalysis = {
  id: "98122d0b-bafd-4c66-8f08-49dd91467b7e",
  workflow_id: clarificationWorkflow.id,
  baseline_version: 1,
  task_family: null,
  recommendation: "LEAVE ALONE",
  priority_score: 0,
  priority_components: { value: 0, feasibility: 0, readiness: 20, safety: 30 },
  mode: "needs_clarification",
  ml_status: "unavailable",
  ml_confidence: null,
  model_version: null,
  playbook_id: null,
  playbook_version: null,
  provider_model: null,
  prompt_version: null,
  summary: "Development fixture showing an unavailable classifier. No inference or live analysis was run.",
  steps: [],
  human_review: "Clarify the task before choosing an improvement.",
  risks: ["No validated workflow match is available."],
  missing_information: ["A classifier and backend analysis service are not connected."],
  created_at: "2026-10-20T00:00:00Z",
};

export class FixtureDataError extends Error {
  readonly name = "FixtureDataError";
  readonly mode = "development_fixture";
  constructor(readonly code: "fixture_not_found" | "fixture_analysis_absent" | "fixture_aborted", message: string) {
    super(message);
  }
}

/** Read-only snapshots, not a mock backend or a fallback for HTTP requests. */
export function createDevelopmentFixtureSource(options: { mode: "development_fixture" }) {
  if (options?.mode !== "development_fixture")
    throw new Error("Development fixtures require an explicit development_fixture mode.");
  const snapshot = {
    workspace,
    workflows: [workflow, clarificationWorkflow],
    analyses: [clarification],
    scenarios: [] as ApiScenario[],
    measurements: [] as ApiMeasurement[],
  };
  function result<T>(body: T, call?: ApiCallOptions): ApiResult<T> {
    if (call?.signal?.aborted)
      throw new FixtureDataError("fixture_aborted", "The fixture read was cancelled.");
    // Fixture reads do not invent HTTP statuses or server request IDs.
    return { body: structuredClone(body), status: null, requestId: null };
  }
  return {
    mode: "development_fixture" as const,
    label: DEVELOPMENT_FIXTURE_LABEL,
    getSnapshot: () => structuredClone(snapshot),
    async getWorkflow(id: string, call?: ApiCallOptions) {
      const found = snapshot.workflows.find((item) => item.id === id);
      if (!found) throw new FixtureDataError("fixture_not_found", "This workflow is not in the development fixtures.");
      return result(found, call);
    },
    async getAnalysis(id: string, call?: ApiCallOptions) {
      if (!snapshot.workflows.some((item) => item.id === id))
        throw new FixtureDataError("fixture_not_found", "This workflow is not in the development fixtures.");
      const found = snapshot.analyses.find((item) => item.workflow_id === id);
      if (!found) throw new FixtureDataError("fixture_analysis_absent", "This fixture has no analysis. No inference was run.");
      return result(found, call);
    },
  } satisfies GainveraReadSource & { getSnapshot(): typeof snapshot };
}
