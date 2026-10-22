import { ApiClientError, ApiInputError } from "../api";
import type { ApiAnalysis } from "../api";
import { PreviewStateError } from "./preview";

export type AnalysisExample = "live_ai" | "reviewed_fallback" | "abstained" | "unavailable";
/** Static reference examples. They never analyze, score or change a user's workflow. */
export function analysisExample(kind: AnalysisExample): ApiAnalysis {
  const successful = kind === "live_ai" || kind === "reviewed_fallback";
  return {
    id: "98122d0b-bafd-4c66-8f08-49dd91467b7e",
    workflow_id: "f1393f14-ee79-4eae-8e31-dff6743aeb38", baseline_version: 1,
    task_family: successful ? "catalog_copy" : null,
    recommendation: successful ? "AI-ASSISTED" : "LEAVE ALONE",
    priority_score: successful ? 64 : 0,
    priority_components: successful ? { value: 50, feasibility: 65, readiness: 70, safety: 75 } : { value: 0, feasibility: 0, readiness: 20, safety: 30 },
    mode: kind === "live_ai" ? "ai_assisted" : kind === "reviewed_fallback" ? "reviewed_playbook_fallback" : "needs_clarification",
    ml_status: successful ? "recognized" : kind === "abstained" ? "abstained" : "unavailable",
    ml_confidence: successful ? 0.81 : kind === "abstained" ? 0.12 : null,
    model_version: kind === "unavailable" ? null : "SIMULATED-MODEL-ONLY",
    playbook_id: successful ? "SIMULATED-NOT-REVIEWED" : null,
    playbook_version: successful ? "SIMULATED-VERSION" : null,
    provider_model: kind === "live_ai" ? "SIMULATED-NO-PROVIDER-CALL" : null,
    prompt_version: kind === "live_ai" ? "SIMULATED-PROMPT" : null,
    summary: successful ? "Static catalog-copy example: a person reviews a draft against confirmed product facts. No model or reviewed playbook produced this text." : "Static clarification example: gather missing information before choosing an improvement.",
    steps: successful ? ["Confirm material, size and care facts.", "Draft for human review; verify all claims before publishing."] : [],
    human_review: "People retain publishing and all refund/dispute approval decisions.",
    risks: ["This is a display fixture, not actual guidance, review or model performance."],
    missing_information: successful ? [] : ["Confirmed task inputs and validated classifier/playbook availability."],
    created_at: "2026-10-20T00:00:00Z",
  };
}

export type FailureExample = "network" | "unauthenticated" | "forbidden" | "not_found" | "conflict" | "validation" | "rate_limited" | "dependency";
export function failureExample(kind: FailureExample) {
  const statuses = { network: null, unauthenticated: 401, forbidden: 403, not_found: 404, conflict: 409, validation: 422, rate_limited: 429, dependency: 503 };
  const codes = { network: "network_error", unauthenticated: "unauthenticated", forbidden: "forbidden", not_found: "not_found", conflict: "conflict", validation: "validation_error", rate_limited: "rate_limited", dependency: "dependency_unavailable" };
  return new ApiClientError(kind === "network" ? "network" : "http", codes[kind], "Simulated request failure.", statuses[kind],
    "ce5d45af-fd7d-47ed-af84-d410385ebc31", kind === "validation" ? [{ field: "body.baseline_version", code: "invalid_value", message: "Select a known baseline version." }] : [],
    ["network", "rate_limited", "dependency"].includes(kind));
}

export function presentFailure(error: unknown) {
  if (error instanceof ApiInputError) return { title: "Check your input", message: error.message, action: "correct" as const, requestId: null, details: error.details };
  if (error instanceof PreviewStateError && error.code === "stale_version")
    return { title: "Baseline changed", message: "Keep your draft. Reload the latest baseline and reconcile your changes before saving again.", action: "reconcile" as const, requestId: null, details: [] };
  if (error instanceof ApiClientError) {
    const common = { requestId: error.requestId, details: error.details, retryable: error.retryable };
    if (error.status === 401 || error.kind === "auth") return { ...common, title: "Sign-in required", message: "Your session is missing or expired. Re-authenticate before accessing business data.", action: "signin" as const };
    if (error.status === 409) return { ...common, title: "Baseline changed", message: "Refetch the latest record and reconcile your draft. Do not overwrite a newer version or retry the write blindly.", action: "reconcile" as const };
    if (error.status === 422) return { ...common, title: "Check your input", message: "Correct the indicated fields before submitting again.", action: "correct" as const };
    if (error.status === 404 || error.status === 403) return { ...common, title: "Record unavailable", message: "The record is missing or inaccessible. Refresh the workspace list; an unavailable service is never an empty successful list.", action: "reload" as const };
    if (error.kind === "network") return { ...common, title: "Connection interrupted", message: "The request outcome is unknown. Refetch before retrying a write; it may already have been saved.", action: "retry_read" as const };
    if (error.status === 503 || error.status === 429) return { ...common, title: error.status === 429 ? "Try again later" : "Service unavailable", message: "Keep your input. Follow the retry hint for reads; writes are never replayed automatically. No fixtures or empty results replace this failure.", action: error.retryable ? "retry_read" as const : "none" as const };
    if (error.kind === "aborted") return { ...common, title: "Request cancelled", message: "No successful result was received. Refetch before retrying a write.", action: "none" as const };
    return { ...common, title: "Result unavailable", message: "No valid result was received. Keep your input and check the service; do not replay a write automatically.", action: error.retryable ? "retry_read" as const : "none" as const };
  }
  return { title: "Result unavailable", message: "No valid result was received. Keep your input and try a read again later.", action: "retry_read" as const, requestId: null, details: [] };
}
