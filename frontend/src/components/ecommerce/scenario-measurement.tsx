"use client";
import { useRef, useState } from "react";
import { measurementInputBody, scenarioInputBody } from "@/lib/api";
import type { ApiMeasurementInput, ApiScenarioInput, ApiWorkflow } from "@/lib/api";
import type { PreviewState } from "@/lib/ecommerce/preview";
import { calculateLocalROI, compareLocalMeasurement, currentLocalScenario } from "@/lib/ecommerce/results";
import type { LocalScenario } from "@/lib/ecommerce/results";
import { number } from "../ui";
import { FailureNotice } from "./recommendation-view";
import styles from "./ecommerce-preview.module.css";

export const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const numeric = (value: string) => value.trim() === "" ? NaN : Number(value);

export function ScenarioPanel({ state, workflow, onSave }: {
  state: PreviewState; workflow: ApiWorkflow;
  onSave(input: ApiScenarioInput, source: LocalScenario["assumptionSource"]): void;
}) {
  const existing = currentLocalScenario(state, workflow);
  const [fields, setFields] = useState({
    reduction_percent: existing ? String(existing.input.reduction_percent) : "",
    setup_hours: existing ? String(existing.input.setup_hours) : "",
    setup_fees: existing ? String(existing.input.setup_fees) : "",
    monthly_tool_fees: existing ? String(existing.input.monthly_tool_fees) : "",
    monthly_maintenance_hours: existing ? String(existing.input.monthly_maintenance_hours) : "",
  });
  const [source, setSource] = useState<LocalScenario["assumptionSource"]>(existing?.assumptionSource ?? "user_scenario");
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const parse = () => scenarioInputBody({
    baseline_version: workflow.baseline_version,
    reduction_percent: numeric(fields.reduction_percent), setup_hours: numeric(fields.setup_hours), setup_fees: numeric(fields.setup_fees),
    monthly_tool_fees: numeric(fields.monthly_tool_fees), monthly_maintenance_hours: numeric(fields.monthly_maintenance_hours),
  });
  let roi: ReturnType<typeof calculateLocalROI> | null = null;
  try { roi = calculateLocalROI(workflow, parse()); } catch { /* Incomplete form is not a zero-savings scenario. */ }
  return <div className={styles.resultPanel}>
    <div className={styles.formNote}><strong>Local arithmetic preview · baseline v{workflow.baseline_version}</strong><p>Reduction is your scenario assumption including review/corrections, not an ML prediction. No backend calculation or priority update occurs. Future API results are authoritative; capacity value is not guaranteed cash savings.</p></div>
    <form className={styles.form} noValidate onSubmit={(event) => {
      event.preventDefault();
      try { onSave(parse(), source); setError(null); setSaved(true); }
      catch (failure) { setError(failure); requestAnimationFrame(() => errorRef.current?.focus()); }
    }}>
      {error !== null && <div ref={errorRef} tabIndex={-1}><FailureNotice error={error} /></div>}
      <button type="button" className={styles.secondary} onClick={() => {
        setFields({ reduction_percent: "40", setup_hours: "2", setup_fees: "0", monthly_tool_fees: "10", monthly_maintenance_hours: "0.5" });
        setSource("illustrative_sample"); setSaved(false); setError(null);
      }}>Use illustrative assumptions</button>
      <p className={styles.muted}>Assumption source: {source === "illustrative_sample" ? "Illustrative sample, not validated" : "User scenario"}. No reduction is pre-filled unless you choose the sample.</p>
      <div className={styles.twoColumns}>{([
        ["reduction_percent", "Reduction assumption (%)", 100, "Includes human review and corrections."],
        ["setup_hours", "Setup hours", 744, "One-time labor, decimal hours."],
        ["setup_fees", "Setup fees (USD)", 1000000, "Fees only; setup labor is calculated separately."],
        ["monthly_tool_fees", "Monthly tool fees (USD)", 1000000, "Recurring fees, excluding maintenance labor."],
        ["monthly_maintenance_hours", "Monthly maintenance hours", 744, "Ongoing upkeep, separate from production/review."],
      ] as const).map(([key, label, max, hint]) => <div key={key}><label htmlFor={`scenario-${key}`}>{label}</label>
        <input id={`scenario-${key}`} type="number" required min={0} max={max} step="any" value={fields[key]}
          aria-describedby={`scenario-${key}-hint`} onChange={(event) => { setFields((previous) => ({ ...previous, [key]: event.target.value })); setSource("user_scenario"); setSaved(false); }} />
        <small id={`scenario-${key}-hint`}>{hint} Range: 0–{max.toLocaleString("en-US")}.</small></div>)}</div>
      <div className={styles.formFooter}><button className={styles.primary} type="submit">Keep scenario in preview</button></div>
      {saved && <p role="status">Scenario kept only in this preview. No API request was made.</p>}
    </form>
    {roi ? <><h3>Local scenario calculation</h3><dl className={styles.calculation}>
      {([
        ["Baseline monthly hours", `${number(roi.baseline_monthly_hours)} hrs`],
        ["Gross hours saved (before upkeep)", `${number(roi.gross_hours_saved)} hrs`],
        ["Production + review after", `${number(roi.production_and_review_hours_after)} hrs`],
        ["Total hours after (with upkeep)", `${number(roi.total_hours_after)} hrs`],
        ["Net hours released", `${number(roi.net_hours_released)} hrs`],
        ["Gross capacity value", usd(roi.gross_capacity_value)], ["Recurring cost (fees + upkeep labor)", usd(roi.recurring_cost)],
        ["Net monthly value", usd(roi.net_monthly_value)], ["Initial investment (labor + fees)", usd(roi.initial_investment)],
        ["First-month value", usd(roi.first_month_value)], ["Payback", roi.payback_months === null ? "No positive payback" : `${number(roi.payback_months)} months`],
      ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl><p className={styles.muted}>Negative time and value remain visible. Display rounding never changes the calculation.</p></> : <p className={styles.empty}>Enter all five valid assumptions to calculate locally. No savings assumed.</p>}
  </div>;
}

export function MeasurementPanel({ state, workflow, onSave }: {
  state: PreviewState; workflow: ApiWorkflow; onSave(input: ApiMeasurementInput): void;
}) {
  const [baselineVersion, setBaselineVersion] = useState(String(workflow.baseline_version));
  const [fields, setFields] = useState({ period: "", production_and_review_hours_after: "", maintenance_hours_after: "", monthly_tools_and_fees: "", initial_implementation_cost: "" });
  const [isDemo, setIsDemo] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const baselines = state.baselines.filter((item) => item.id === workflow.id);
  const selected = baselines.find((item) => item.baseline_version === Number(baselineVersion));
  const measurements = state.measurements.filter((item) => item.workflow_id === workflow.id);
  return <div className={styles.resultPanel}>
    <p className={styles.formNote}>Local entry only. Hypothetical examples and self-reported outcomes are not independently verified. Use the original baseline version; tools/fees exclude upkeep labor and production/review excludes maintenance.</p>
    <form className={styles.form} noValidate onSubmit={(event) => {
      event.preventDefault();
      try {
        const input = measurementInputBody({
          baseline_version: numeric(baselineVersion), period: fields.period,
          production_and_review_hours_after: numeric(fields.production_and_review_hours_after), maintenance_hours_after: numeric(fields.maintenance_hours_after),
          monthly_tools_and_fees: numeric(fields.monthly_tools_and_fees), initial_implementation_cost: numeric(fields.initial_implementation_cost), is_demo: isDemo,
        });
        onSave(input); setError(null); setSaved(true);
      } catch (failure) { setError(failure); requestAnimationFrame(() => errorRef.current?.focus()); }
    }}>
      {error !== null && <div ref={errorRef} tabIndex={-1}><FailureNotice error={error} /></div>}
      <div className={styles.twoColumns}>
        <div><label htmlFor="measurement-baseline">Original baseline version</label><select id="measurement-baseline" value={baselineVersion} onChange={(event) => { setBaselineVersion(event.target.value); setSaved(false); }}>{baselines.map((item) => <option key={item.baseline_version} value={item.baseline_version}>v{item.baseline_version}{item.baseline_version === workflow.baseline_version ? " — Current" : " — Historical"}</option>)}</select></div>
        <div><label htmlFor="measurement-period">Measurement month (YYYY-MM)</label><input id="measurement-period" value={fields.period} required maxLength={7} placeholder="YYYY-MM" onChange={(event) => { setFields((previous) => ({ ...previous, period: event.target.value })); setSaved(false); }} /></div>
      </div>
      <p className={styles.muted}>{selected ? `Original baseline: ${number(selected.hours_per_occurrence * selected.occurrences_per_month)} hours/month at ${usd(selected.hourly_cost)}/hour.` : "Baseline unavailable — comparison withheld."}</p>
      <div className={styles.twoColumns}>{([
        ["production_and_review_hours_after", "Production and review hours after", 744, "Exclude upkeep; include corrections and review."],
        ["maintenance_hours_after", "Maintenance hours after", 744, "Upkeep only, separate from production/review."],
        ["monthly_tools_and_fees", "Monthly tools and fees (USD)", 1000000, "Exclude maintenance labor to avoid double counting."],
        ["initial_implementation_cost", "Initial implementation cost (USD)", 1000000, "One inclusive total: setup labor plus fees."],
      ] as const).map(([key, label, max, hint]) => <div key={key}><label htmlFor={`measurement-${key}`}>{label}</label><input id={`measurement-${key}`} type="number" min={0} max={max} step="any" required value={fields[key]} aria-describedby={`measurement-${key}-hint`} onChange={(event) => { setFields((previous) => ({ ...previous, [key]: event.target.value })); setSaved(false); }} /><small id={`measurement-${key}-hint`}>{hint}</small></div>)}</div>
      <label className={styles.checkLabel}><input type="checkbox" checked={isDemo} onChange={(event) => setIsDemo(event.target.checked)} />This is hypothetical demo data</label>
      <p className={styles.muted}>{isDemo ? "Hypothetical entry — not an observed result." : "Self-reported and unverified; still stored only in this local fixture session."}</p>
      <div className={styles.formFooter}><button className={styles.primary} type="submit">Keep measurement in preview</button></div>
      {saved && <p role="status">Measurement kept with its original baseline. Nothing was submitted to a server.</p>}
    </form>
    <h3>Measurement history</h3>
    {measurements.length === 0 ? <p className={styles.empty}>Not measured yet.</p> : <ul className={styles.history}>{measurements.map((item) => {
      const comparison = compareLocalMeasurement(state, item);
      return <li key={item.id}><strong>{item.period} · Baseline v{item.baseline_version} · {item.is_demo ? "Hypothetical" : "Self-reported, unverified"}</strong>
        <span>Production/review: {number(item.production_and_review_hours_after)} hrs; upkeep: {number(item.maintenance_hours_after)} hrs; tool fees: {usd(item.monthly_tools_and_fees)}; inclusive setup: {usd(item.initial_implementation_cost)}.</span>
        {comparison ? <><span>Original baseline: {number(comparison.baselineHours)} hrs/month at {usd(comparison.originalHourlyCost)}/hour. Total reported hours: {number(comparison.totalHoursAfter)}.</span>
          <span>Local comparison: {number(comparison.netHoursReleased)} net hours released; {usd(comparison.netMonthlyValue)} net monthly value; {usd(comparison.firstMonthValue)} first-month value. Payback: {comparison.paybackMonths === null ? "No positive payback" : `${number(comparison.paybackMonths)} months`}.</span>
          <span>Matching scenario total hours: {comparison.scenarioHoursAfter === null ? "Not available" : number(comparison.scenarioHoursAfter)}. {comparison.hoursVariance === null ? "No scenario comparison available." : `Scenario minus reported hours: ${number(comparison.hoursVariance)}.`}</span></> : <span>Original baseline unavailable — comparison withheld.</span>}
      </li>;
    })}</ul>}
  </div>;
}
