"use client";
import type { PreviewState } from "@/lib/ecommerce/preview";
import { compareLocalMeasurement, previewDashboard } from "@/lib/ecommerce/results";
import { createFixtureReportHtml } from "@/lib/ecommerce/report";
import { number } from "../ui";
import { usd } from "./scenario-measurement";
import styles from "./ecommerce-preview.module.css";

export function ResultsOverview({ state, onOpen }: { state: PreviewState; onOpen(id: string): void }) {
  const dashboard = previewDashboard(state);
  return <section className={styles.overview} aria-labelledby="preview-overview-title">
    <h2 id="preview-overview-title">Scenario & result overview</h2>
    <p className={styles.formNote}>LOCAL FIXTURE PRESENTATION. These are in-memory inputs and arithmetic previews, not a backend dashboard or real store results. No analysis or priority rules run. Measurements from different months/baselines are not combined as savings.</p>
    <div className={styles.resultMetrics}>
      <article><span>Current baseline workload</span><strong>{number(dashboard.baselineHours)} hrs/month</strong></article>
      <article><span>Current-baseline scenario coverage</span><strong>{dashboard.scenarioCount} / {dashboard.workflowCount}</strong></article>
      <article><span>Local scenario net value</span><strong>{dashboard.localScenarioNetValue === null ? "Not calculated" : usd(dashboard.localScenarioNetValue)}</strong><small>Sum of kept assumptions only; includes negative values.</small></article>
      <article><span>Measurement entries</span><strong>{dashboard.measurementCount}</strong><small>Hypothetical or self-reported; unverified.</small></article>
    </div>
    {dashboard.rows.length === 0 ? <div className={styles.empty}>No workflows in this preview workspace.</div> : <ul className={styles.overviewRows}>{dashboard.rows.map(({ workflow, roi, measurements }) => <li key={workflow.id}>
      <h3><button onClick={() => onOpen(workflow.id)}>{workflow.name}</button></h3>
      <p>Current baseline v{workflow.baseline_version} · {workflow.analysis_status.replaceAll("_", " ")}</p>
      <dl><div><dt>Local scenario, current baseline</dt><dd>{roi ? `${usd(roi.net_monthly_value)}/month; ${number(roi.net_hours_released)} net hours released` : "No current scenario — no savings assumed"}</dd></div>
        <div><dt>Measurement history</dt><dd>{measurements.length ? measurements.map((item) => `${item.period} / v${item.baseline_version} / ${item.is_demo ? "Hypothetical" : "Self-reported, unverified"}`).join("; ") : "Not measured yet"}</dd></div>
        <div><dt>Live recommendation / priority / confidence</dt><dd>Not available</dd></div></dl>
    </li>)}</ul>}
  </section>;
}

export function FixtureReportView({ state }: { state: PreviewState }) {
  const dashboard = previewDashboard(state);
  const download = () => {
    const url = URL.createObjectURL(new Blob([createFixtureReportHtml(state)], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "gainvera-development-fixture-report.html";
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className={styles.detail}>
    <p className={styles.formNote}><strong>Development fixture report · local preview</strong><br />No live model result, reviewed guidance, cloud save or verified business savings. This view uses agreed record fields, not an invented report API contract. Local arithmetic is illustrative; future backend calculations are authoritative.</p>
    <button className={styles.primary} onClick={download}>Download fixture HTML report</button>
    <p className={styles.muted}>The standalone HTML is escaped and works offline. Open it and use browser Print / Save PDF if needed.</p>
    <h3>{state.workspaces.find((item) => item.id === state.selectedWorkspaceId)?.name}</h3>
    <p>{dashboard.workflowCount} workflows · {number(dashboard.baselineHours)} baseline hours/month · {dashboard.scenarioCount} current-baseline scenarios · {dashboard.measurementCount} measurement entries.</p>
    {dashboard.rows.length === 0 && <p className={styles.empty}>No workflows to report.</p>}
    {dashboard.rows.map(({ workflow, scenario, roi, measurements }) => <article className={styles.reportArticle} key={workflow.id}>
      <h3>{workflow.name}</h3><p>{workflow.description}</p><p>Baseline v{workflow.baseline_version}: {workflow.hours_per_occurrence} hours × {workflow.occurrences_per_month}/month; {usd(workflow.hourly_cost)}/hour. Risk: {workflow.risk}; data: {workflow.data_availability}.</p>
      <p>No live analysis, recommendation, priority or ML confidence is available. State-gallery examples are not saved as results.</p>
      {scenario && roi ? <><h4>Local scenario · {scenario.assumptionSource}</h4><p>Reduction {scenario.input.reduction_percent}% including review; setup {scenario.input.setup_hours} hours + {usd(scenario.input.setup_fees)} fees; upkeep {scenario.input.monthly_maintenance_hours} hours/month + {usd(scenario.input.monthly_tool_fees)} tool fees.</p><p>Total hours after: {number(roi.total_hours_after)}; net time released: {number(roi.net_hours_released)}. Net monthly value: {usd(roi.net_monthly_value)}; initial investment: {usd(roi.initial_investment)}; first month: {usd(roi.first_month_value)}. Payback: {roi.payback_months === null ? "No positive payback" : `${number(roi.payback_months)} months`}.</p></> : <p>No scenario for the current baseline; no savings assumed.</p>}
      <h4>Measurement history</h4>{measurements.length === 0 ? <p>Not measured yet.</p> : measurements.map((item) => {
        const comparison = compareLocalMeasurement(state, item);
        return <section key={item.id}><p>{item.period} · baseline v{item.baseline_version} · {item.is_demo ? "Hypothetical" : "Self-reported, unverified"} · local entry.</p><p>Production/review: {item.production_and_review_hours_after} hrs; upkeep: {item.maintenance_hours_after} hrs; tool fees: {usd(item.monthly_tools_and_fees)}; inclusive initial cost: {usd(item.initial_implementation_cost)}.</p>
          {comparison ? <p>Original baseline: {number(comparison.baselineHours)} hours at {usd(comparison.originalHourlyCost)}/hour. Net hours released: {number(comparison.netHoursReleased)}; monthly value: {usd(comparison.netMonthlyValue)}; first month: {usd(comparison.firstMonthValue)}. Matching scenario hours: {comparison.scenarioHoursAfter === null ? "Not available" : number(comparison.scenarioHoursAfter)}.</p> : <p>Original baseline unavailable — comparison withheld.</p>}</section>;
      })}
    </article>)}
  </div>;
}
