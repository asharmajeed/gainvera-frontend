"use client";
import { useState, useEffect, useSyncExternalStore } from "react";
import type { ApiAnalysisState, ApiDashboard, ApiROI, ApiMeasurementResult, ApiReportDownload } from "@/lib/api";
import { AccountStore } from "@/lib/account/store";
import { WorkspaceResultsStore, type Resource } from "@/lib/account/results-store";
import { FailureNotice } from "./recommendation-view";
import styles from "./ecommerce-preview.module.css";

export const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
export const decimal = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);
export function ReadStatus<T>({ value, onRetry, label }: { value: Resource<T>; onRetry(): void; label: string }) {
  return <>{value.loading && <p role="status">Loading {label}…</p>}{value.error !== null && <div><FailureNotice error={value.error} /><button type="button" className={styles.secondary} onClick={onRetry}>Retry {label} read</button>{value.data !== null && <p className={styles.formNote}>Showing the last read result. Its current state could not be confirmed.</p>}</div>}</>;
}
export function ServerROI({ roi, stale = false }: { roi: ApiROI; stale?: boolean }) {
  return <section className={styles.serverResult}><h3>{stale ? "Historical / stale backend ROI — excluded from current estimates" : "Authoritative backend ROI"}</h3><p>Conditional capacity estimates, not guaranteed cash savings. Reduction includes review/corrections and is a scenario assumption, not an ML prediction.</p><dl className={styles.calculation}>{([
    ["Baseline hours / month", `${decimal(roi.baseline_monthly_hours)} hrs`], ["Gross hours saved, before upkeep", `${decimal(roi.gross_hours_saved)} hrs`],
    ["Production and review after", `${decimal(roi.production_and_review_hours_after)} hrs`], ["Total hours after, including maintenance", `${decimal(roi.total_hours_after)} hrs`],
    ["Net hours released", `${decimal(roi.net_hours_released)} hrs`], ["Gross capacity value", money(roi.gross_capacity_value)], ["Recurring fees and upkeep labor", money(roi.recurring_cost)],
    ["Net monthly value", money(roi.net_monthly_value)], ["Initial investment, labor plus fees", money(roi.initial_investment)], ["First-month value", money(roi.first_month_value)],
    ["Payback", roi.payback_months === null ? "No positive payback" : `${decimal(roi.payback_months)} months`],
  ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className={styles.muted}>Only display values are rounded. Negative values and null payback are retained.</p></section>;
}
export function AnalysisDetails({ value, priority }: { value: ApiAnalysisState; priority?: number | null }) {
  const analysis = value.analysis, book = value.playbook;
  return <section className={styles.serverResult}>
    <h3>{({ not_analyzed: "Not analyzed", ready: "Analysis ready", needs_clarification: "Needs clarification", needs_reanalysis: "Needs reanalysis" })[value.state]}</h3>
    <p>Current baseline v{value.current_baseline_version}{analysis && ` · Analysis baseline v${analysis.baseline_version}`}</p>
    {value.state === "not_analyzed" && <p>No family, recommendation, priority or confidence has been supplied. No reduction is assumed.</p>}
    {value.state === "needs_reanalysis" && <p className={styles.formNote}>The saved analysis below belongs to old inputs. It is stale and cannot authorize a current scenario.</p>}
    {analysis && <>
      <div className={styles.resultMetrics}><article><span>Task family</span><strong>{analysis.task_family ?? "Not recognized"}</strong><small>Classifier output</small></article>
        <article><span>Final recommendation</span><strong>{analysis.recommendation}</strong><small>Backend rules, not classifier confidence</small></article>
        <article><span>Priority</span><strong>{priority ?? analysis.priority_score} / 100</strong><small>Backend business-priority score</small></article>
        <article><span>ML confidence</span><strong>{analysis.ml_confidence === null ? "Unavailable" : `${decimal(analysis.ml_confidence * 100)}%`}</strong><small>Not accuracy, safety or a probability of savings</small></article></div>
      <p className={styles.formNote}><strong>{analysis.mode === "reviewed_playbook_fallback" ? "Reviewed-playbook fallback — no live AI generation" : analysis.mode === "needs_clarification" ? "Clarification required; no operational recommendation is authorized" : "Provider-assisted selection of reviewed guidance"}</strong><br />Guidance reason: {analysis.guidance_reason ?? "Unavailable"}. ML status: {analysis.ml_status}; reason: {analysis.ml_reason ?? "Unavailable"}.</p>
      <p>{analysis.summary}</p>
      {analysis.missing_information.length > 0 && <><h4>Missing facts</h4><ul>{analysis.missing_information.map((item, i) => <li key={i}>{item}</li>)}</ul></>}
      {analysis.safety_reasons.length > 0 && <><h4>Safety reasons</h4><ul>{analysis.safety_reasons.map((item, i) => <li key={i}>{item}</li>)}</ul></>}
      {book && <><h4>Reviewed conditions</h4><p>{book.conditions}</p><h4>Required inputs</h4><ul>{book.required_inputs.map((item, i) => <li key={i}>{item}</li>)}</ul></>}
      {analysis.steps.length > 0 && <><h4>Reviewed guidance steps</h4><ol>{analysis.steps.map((item, i) => <li key={i}>{item}</li>)}</ol></>}
      <h4>Human review remains required</h4><p>{analysis.human_review}</p>{book && book.human_review !== analysis.human_review && <p>{book.human_review}</p>}
      <h4>Risks and stop conditions</h4><ul>{analysis.risks.map((item, i) => <li key={i}>{item}</li>)}</ul>
      {book && <><h4>Reviewed measurement method</h4><p>{book.measurement_method}</p><details><summary>Reviewed template</summary><pre className={styles.provenance}>{book.example_template}</pre></details></>}
      <details><summary>Analysis and reviewed-source provenance</summary><dl>{([
        ["Analysis ID", analysis.id], ["Model", analysis.model_version], ["Rules", analysis.rules_version], ["Playbook", analysis.playbook_id], ["Playbook version", analysis.playbook_version],
        ["Provider model", analysis.provider_model], ["Prompt", analysis.prompt_version], ["Created", analysis.created_at], ["Reviewer", book?.reviewed_by], ["Reviewed at", book?.reviewed_at],
      ] as const).map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text ?? "Unavailable"}</dd></div>)}</dl>{book && <pre className={styles.provenance}>{JSON.stringify(book.provenance, null, 2)}</pre>}</details>
    </>}
  </section>;
}
export function MeasurementComparison({ value }: { value: ApiMeasurementResult }) {
  const original = value.original_baseline.snapshot;
  return <div><strong>{value.measurement.period} · Baseline v{value.original_baseline.baseline_version} · {value.provenance === "hypothetical" ? "Hypothetical" : "Self-reported, unverified"}</strong>
    <p>Original baseline: {original.hours_per_occurrence} hours × {original.occurrences_per_month}/month at {money(original.hourly_cost)}/hour.</p>
    <p>Backend comparison: {decimal(value.net_hours_released)} net hours released; {money(value.net_monthly_value)} net monthly capacity value; {money(value.first_month_value)} first-month value.</p>
  </div>;
}
function deliverReport(report: ApiReportDownload) {
  const url = URL.createObjectURL(report.blob), link = document.createElement("a");
  link.href = url; link.download = report.filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function AccountDashboard({ parent, onOpen }: { parent: AccountStore; onOpen(id: string): void }) {
  const [store] = useState(() => new WorkspaceResultsStore(parent));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => store.start(), [store]);
  const dashboard = state.dashboard.data;
  return <section className={styles.overview} aria-label="Account dashboard">
    <div className={styles.accountToolbar}><h2>Store dashboard</h2><button className={styles.secondary} disabled={state.dashboard.loading} onClick={() => void store.refresh()}>Refresh dashboard</button><button className={styles.primary} disabled={state.exporting} onClick={() => void store.exportReport(deliverReport)}>{state.exporting ? "Downloading report…" : "Download authenticated HTML report"}</button></div>
    <ReadStatus value={state.dashboard} label="dashboard" onRetry={() => void store.refresh()} />
    {state.exportError !== null && <FailureNotice error={state.exportError} />}<p role="status">{state.exportNotice}</p>
    {dashboard && <DashboardBody dashboard={dashboard} onOpen={onOpen} />}
  </section>;
}
function DashboardBody({ dashboard, onOpen }: { dashboard: ApiDashboard; onOpen(id: string): void }) {
  const c = dashboard.coverage, t = dashboard.scenario_totals;
  return <><p className={styles.formNote}>Authoritative server snapshot · {dashboard.workspace.name} · Generated {dashboard.generated_at}. Includes workflows outside the visible list page. Conditional capacity is not guaranteed cash savings.</p>
    <div className={styles.resultMetrics}><article><span>All workflows</span><strong>{c.total_workflows}</strong></article><article><span>Ready analyses</span><strong>{c.ready}</strong></article><article><span>Current saved scenarios</span><strong>{c.current_scenarios}</strong></article><article><span>Measurement records</span><strong>{c.measurement_records}</strong></article></div>
    <dl className={styles.calculation}><div><dt>Not analyzed</dt><dd>{c.not_analyzed}</dd></div><div><dt>Needs clarification</dt><dd>{c.needs_clarification}</dd></div><div><dt>Needs reanalysis</dt><dd>{c.needs_reanalysis}</dd></div><div><dt>All current workload</dt><dd>{decimal(t.all_workflow_monthly_hours)} hrs/month</dd></div><div><dt>Workflows with current estimates</dt><dd>{t.covered_workflows}</dd></div>
      {([["Covered baseline hours", t.baseline_monthly_hours, false], ["Gross hours saved", t.gross_hours_saved, false], ["Net hours released", t.net_hours_released, false], ["Net monthly capacity value", t.net_monthly_value, true], ["Initial investment", t.initial_investment, true], ["First-month value", t.first_month_value, true]] as const).map(([label, value, currency]) => <div key={label}><dt>{label}</dt><dd>{value === null ? "Unestimated" : currency ? money(value) : `${decimal(value)} hrs`}</dd></div>)}
    </dl><p>Null estimates are unestimated, not zero savings. Initial/first-month totals assume starting the covered projects together.</p>
    <h3>Server-ranked workflows</h3>{dashboard.ranked_workflows.length === 0 ? <p>No workflows in this workspace.</p> : <ol className={styles.overviewRows}>{dashboard.ranked_workflows.map((row) => <li key={row.workflow.id}><h4><button onClick={() => onOpen(row.workflow.id)}>{row.workflow.name}</button></h4><p>Baseline v{row.workflow.baseline_version} · {row.analysis_state.state.replaceAll("_", " ")} · {row.analysis_state.analysis?.task_family ?? "Family unavailable"}</p><p>Recommendation: {row.analysis_state.analysis?.recommendation ?? "Not available"}. Priority: {row.scenario_state.state === "ready" ? row.scenario_state.priority_score : row.analysis_state.analysis?.priority_score ?? "Not available"}. Scenario: {row.scenario_state.state.replaceAll("_", " ")}.</p></li>)}</ol>}
    <h3>Individual outcomes by period and original baseline</h3>{dashboard.measurements.length === 0 ? <p className={styles.empty}>Not measured yet.</p> : <ul className={styles.history}>{dashboard.measurements.map((row) => <li key={row.measurement.id}><MeasurementComparison value={row} /></li>)}</ul>}
    <h3>Server notes</h3><ul>{dashboard.notes.map((note, i) => <li key={i}>{note}</li>)}</ul>
  </>;
}
