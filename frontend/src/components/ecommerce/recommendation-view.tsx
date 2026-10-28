"use client";
import { useState } from "react";
import type { ApiWorkflow } from "@/lib/api";
import { ApiClientError } from "@/lib/api";
import { currentPreviewAnalysis } from "@/lib/ecommerce/preview";
import type { PreviewState } from "@/lib/ecommerce/preview";
import { analysisExample, failureExample, presentFailure } from "@/lib/ecommerce/response-examples";
import type { AnalysisExample, FailureExample } from "@/lib/ecommerce/response-examples";
import styles from "./ecommerce-preview.module.css";

export function FailureNotice({ error, simulated = false, onSignIn, onReview, context }: {
  error: unknown; simulated?: boolean; onSignIn?: () => void; onReview?: () => void; context?: "analysis" | "scenario" | "measurement";
}) {
  let failure = presentFailure(error);
  if (error instanceof ApiClientError && error.status === 409 && context) {
    const duplicate = context === "measurement" && error.details.some((item) => item.code === "duplicate_measurement");
    failure = { ...failure, title: duplicate ? "Measurement already exists" : context === "measurement" ? "Measurement conflict" : context === "scenario" ? "Saved scenario or analysis changed" : "Workflow baseline changed",
      message: duplicate ? "An observation already exists for this workflow, original baseline and month. Nothing was overwritten. Refresh history and choose a different period if appropriate." : context === "measurement" ? "Refresh measurement history before retrying. Do not overwrite an existing observation." : "Your draft is retained. Refetch the latest baseline, analysis and saved scenario, review differences and explicitly reconcile before saving again." };
  }
  const [retryNote, setRetryNote] = useState("");
  return <section className={styles.error} role="alert">
    <strong>{simulated ? "Simulated failure: " : ""}{failure.title}</strong><p>{failure.message}</p>
    {failure.details.length > 0 && <ul>{failure.details.map((item, index) => <li key={`${item.field}:${index}`}><strong>{item.field}:</strong> {item.message}</li>)}</ul>}
    {failure.requestId && <p>{simulated ? "Simulated request ID" : "Request ID"}: {failure.requestId}</p>}
    {"retryable" in failure && <p>Retry hint: {failure.retryable ? "a read may be retried; check the outcome before retrying a write" : "not retryable; check input, session or service first"}.</p>}
    {failure.action === "signin" && onSignIn && <button className={styles.secondary} onClick={onSignIn}>Open sign-in status</button>}
    {["reconcile", "correct", "reload"].includes(failure.action) && onReview && <button className={styles.secondary} onClick={onReview}>{context ? "Refetch saved results" : "Review preview baseline"}</button>}
    {failure.action === "retry_read" && simulated && <button className={styles.secondary} onClick={() => setRetryNote("Simulated read retried; the example remains unavailable. No network request or write replay occurred.")}>Retry simulated read</button>}
    {retryNote && <p role="status">{retryNote}</p>}
  </section>;
}

export function RecommendationView({ state, workflow, onSignIn, onReview }: {
  state: PreviewState; workflow: ApiWorkflow; onSignIn(): void; onReview(): void;
}) {
  const [example, setExample] = useState("current");
  const analysis = ["live_ai", "reviewed_fallback", "abstained", "unavailable"].includes(example)
    ? analysisExample(example as AnalysisExample) : currentPreviewAnalysis(state, workflow);
  const isExample = example !== "current";
  const notAnalyzed = example === "not_analyzed" || (example === "current" && workflow.analysis_status === "not_analyzed");
  const needsReanalysis = example === "needs_reanalysis" || (example === "current" && workflow.analysis_status === "needs_reanalysis");
  return <div className={styles.resultPanel}>
    <label htmlFor="analysis-state-example" className={styles.controlLabel}>Preview an analysis state</label>
    <select id="analysis-state-example" className={styles.stateSelect} value={example} onChange={(event) => setExample(event.target.value)}>
      <option value="current">Current workflow status</option>
      <option value="not_analyzed">Simulated: not analyzed</option><option value="needs_reanalysis">Simulated: needs reanalysis</option>
      <option value="live_ai">Simulated: live-AI response</option><option value="reviewed_fallback">Simulated: reviewed-playbook fallback</option>
      <option value="abstained">Simulated: clarification / ML abstained</option><option value="unavailable">Simulated: classifier unavailable</option>
      <option value="loading">Simulated: loading</option><option value="error:network">Simulated: network failure</option>
      <option value="error:unauthenticated">Simulated: expired session (401)</option><option value="error:forbidden">Simulated: forbidden (403)</option>
      <option value="error:not_found">Simulated: missing record (404)</option><option value="error:conflict">Simulated: stale baseline (409)</option>
      <option value="error:validation">Simulated: validation (422)</option><option value="error:rate_limited">Simulated: rate limit (429)</option>
      <option value="error:dependency">Simulated: unavailable service (503)</option>
    </select>
    <p className={styles.formNote}>{isExample
      ? "SIMULATED REFERENCE ONLY. Analysis examples describe a fictional catalog-copy workflow, not an analysis of the selected workflow. Confidence, priority and provenance are dummy display values; no model, provider or review ran. Selection never changes workflow data."
      : "This preview has no live analysis connection. No classifier, agency matcher or AI generation is run."}</p>
    {example.startsWith("error:") ? <FailureNotice key={example} error={failureExample(example.slice(6) as FailureExample)} simulated onSignIn={onSignIn} onReview={onReview} />
      : example === "loading" ? <section className={styles.empty} aria-busy="true"><h3>Simulated loading state</h3><p>No request is in progress. Choose another example to leave this display state.</p></section>
      : notAnalyzed || needsReanalysis || !analysis ? <section className={styles.empty}><h3>{needsReanalysis ? "Needs reanalysis" : notAnalyzed ? "Not analyzed" : "Analysis unavailable"}</h3><p>{needsReanalysis ? "The baseline changed. Previous analysis and scenarios cannot be reused as current results." : "Task family, recommendation, priority and ML confidence are not available yet."}</p><p>No reduction assumption or savings prediction was supplied.</p></section>
      : <>
        <div className={styles.resultMetrics}>
          <article><span>Task family {isExample && "(simulated)"}</span><strong>{analysis.task_family ?? "Not recognized"}</strong><small>Classifier output, separate from the action.</small></article>
          <article><span>Final recommendation</span><strong>{analysis.recommendation}</strong><small>Backend rules own the final action.</small></article>
          <article><span>Priority {isExample && "(simulated)"}</span><strong>{analysis.priority_score} / 100</strong><small>Business priority, not model confidence.</small></article>
          <article><span>ML confidence {isExample && "(simulated)"}</span><strong>{analysis.ml_confidence === null ? "Unavailable" : `${(analysis.ml_confidence * 100).toFixed(0)}%`}</strong><small>Not accuracy or a probability of savings.</small></article>
        </div>
        <h3>{analysis.mode === "ai_assisted" ? "Live-AI mode — simulated" : analysis.mode === "reviewed_playbook_fallback" ? "Reviewed-playbook fallback — simulated, no review performed" : "Needs clarification"}</h3>
        <p>ML status: <strong>{analysis.ml_status}</strong></p><p>{analysis.summary}</p>
        {analysis.steps.length > 0 && <ol>{analysis.steps.map((step) => <li key={step}>{step}</li>)}</ol>}
        <div className={styles.formNote}><strong>Human review</strong><p>{analysis.human_review}</p></div>
        {analysis.missing_information.length > 0 && <><h3>Missing information</h3><ul>{analysis.missing_information.map((item) => <li key={item}>{item}</li>)}</ul></>}
        <h3>Risks & provenance</h3><ul>{analysis.risks.map((item) => <li key={item}>{item}</li>)}</ul>
        <dl>{([
          ["Model version", analysis.model_version], ["Playbook", analysis.playbook_id], ["Playbook version", analysis.playbook_version],
          ["Provider model", analysis.provider_model], ["Prompt version", analysis.prompt_version],
        ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? "Unavailable"}</dd></div>)}</dl>
      </>}
  </div>;
}
