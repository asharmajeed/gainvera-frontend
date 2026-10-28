"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ApiClientError, ApiInputError, measurementInputBody, scenarioEditContext, scenarioSaveBody } from "@/lib/api";
import type { ApiScenarioSaveInput, ApiWorkflow } from "@/lib/api";
import { AccountChangedError, AccountStore } from "@/lib/account/store";
import { WorkflowResultsStore, type WorkflowResultsState } from "@/lib/account/results-store";
import { AnalysisDetails, MeasurementComparison, ReadStatus, ServerROI, money } from "./account-result-presentation";
import { FailureNotice } from "./recommendation-view";
import styles from "./ecommerce-preview.module.css";

const sections = [["analysis", "Recommendation"], ["scenario", "Scenario & ROI"], ["measurements", "Measurements"], ["history", "Inputs & history"]] as const;
type Section = typeof sections[number][0];
export function AccountWorkflowResults({ parent, workflow, onEdit }: { parent: AccountStore; workflow: ApiWorkflow; onEdit(record: ApiWorkflow): void }) {
  const [store] = useState(() => new WorkflowResultsStore(parent, workflow));
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [section, setSection] = useState<Section>("analysis");
  const [visited, setVisited] = useState<Partial<Record<Section, boolean>>>({ analysis: true });
  useEffect(() => store.start(), [store]);
  function select(id: Section) { setSection(id); setVisited((old) => ({ ...old, [id]: true })); }
  return <div className={styles.detail}>
    <p className={styles.formNote}>Saved account results · baseline v{state.workflow.baseline_version}. {state.workflow.is_sample ? "Fictional sample input; the results below are actual backend responses for this example." : "User-entered workflow facts; outcomes are self-reported, not independently verified."}</p>
    <div className={styles.resultTabs} role="tablist" aria-label="Account workflow result sections" onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const position = sections.findIndex(([id]) => id === section);
      const next = event.key === "Home" ? 0 : event.key === "End" ? sections.length - 1 : (position + (event.key === "ArrowRight" ? 1 : -1) + sections.length) % sections.length;
      select(sections[next][0]); document.getElementById(`account-tab-${sections[next][0]}`)?.focus();
    }}>{sections.map(([id, label]) => <button key={id} id={`account-tab-${id}`} role="tab" aria-selected={section === id} aria-controls={`account-panel-${id}`} tabIndex={section === id ? 0 : -1} onClick={() => select(id)}>{label}</button>)}</div>
    {state.contextError !== null && <><FailureNotice error={state.contextError} /><button className={styles.secondary} onClick={() => void store.refreshContext()}>Refetch workflow and result context</button></>}
    {sections.map(([id]) => <section key={id} hidden={section !== id} className={styles.accountResultPanel} role="tabpanel" tabIndex={0} id={`account-panel-${id}`} aria-labelledby={`account-tab-${id}`}>
      {visited[id] && (id === "analysis" ? <AccountAnalysis store={store} state={state} /> : id === "scenario" ? <AccountScenario store={store} state={state} /> : id === "measurements" ? <AccountMeasurements store={store} state={state} /> : <AccountHistory store={store} state={state} />)}
    </section>)}
    <div className={styles.formFooter}><button className={styles.secondary} onClick={() => parent.closeDetail()}>Close results</button><button className={styles.primary} disabled={state.operation !== null} onClick={() => onEdit(state.workflow)}>Edit workflow inputs</button></div>
  </div>;
}
function AccountAnalysis({ store, state }: { store: WorkflowResultsStore; state: WorkflowResultsState }) {
  const [confirm, setConfirm] = useState(false);
  const current = state.analysis.data, analysis = current?.analysis;
  async function analyze() { setConfirm(false); try { await store.analyze(); } catch { /* Structured error is retained by the guarded store. */ } }
  const scenario = state.scenario.data;
  const score = scenario?.state === "ready" && scenario.scenario?.analysis_id === analysis?.id ? scenario.priority_score : undefined;
  return <div className={styles.resultPanel}>
    <ReadStatus value={state.analysis} label="analysis" onRetry={() => void store.refreshContext()} />
    <div className={styles.accountToolbar}><button className={styles.primary} disabled={state.operation !== null || state.analysis.loading || state.analysis.error !== null || state.contextError !== null || state.needsRead.analysis} onClick={() => analysis ? setConfirm(true) : void analyze()}>{state.operation === "analysis" ? "Analyzing…" : analysis ? "Run analysis again" : "Analyze workflow"}</button><button className={styles.secondary} disabled={state.analysis.loading || state.operation !== null} onClick={() => void store.refreshContext()}>Refetch analysis and scenario</button></div>
    <p>Uses the current saved baseline and reviewed-playbook guidance. No live-AI generation or store action is requested. Every accepted rerun creates a new analysis and invalidates the previous scenario, even on the same baseline.</p>
    {state.errors.analysis !== null && <FailureNotice context="analysis" error={state.errors.analysis} onReview={() => void store.refreshContext()} />}
    {state.needsRead.analysis && <p className={styles.formNote}>The write failed or its outcome may be unknown. Refetch analysis and scenario before deciding whether to run again. A rerun is not an idempotent retry.</p>}
    {current && <AnalysisDetails value={current} priority={score} />}
    {confirm && <section role="alert" className={styles.formNote} aria-label="Confirm analysis rerun"><h4>Run a new analysis?</h4><p>This creates a new analysis ID, including on an unchanged baseline. The old scenario remains history; its timestamp cannot be used to save against the new analysis.</p><div className={styles.formFooter}><button className={styles.secondary} onClick={() => setConfirm(false)}>Keep current analysis</button><button className={styles.primary} onClick={() => void analyze()}>Run new analysis</button></div></section>}
  </div>;
}

const scenarioFields = [
  ["reduction_percent", "Reduction assumption (%)", 100, "Include corrections and human review. This is your assumption, not an ML prediction."],
  ["setup_hours", "Setup hours", 744, "One-time labor in decimal hours."],
  ["setup_fees", "Setup fees (USD)", 1_000_000, "Fees only; backend adds setup labor separately."],
  ["monthly_tool_fees", "Monthly tool fees (USD)", 1_000_000, "Exclude maintenance labor."],
  ["monthly_maintenance_hours", "Monthly maintenance hours", 744, "Upkeep is separate from production and review."],
] as const;
type ScenarioFields = Record<typeof scenarioFields[number][0], string>;
const blankScenario = (): ScenarioFields => ({ reduction_percent: "", setup_hours: "", setup_fees: "", monthly_tool_fees: "", monthly_maintenance_hours: "" });
const numeric = (value: string) => value.trim() === "" ? NaN : Number(value);
function fieldInvalid(error: unknown, name: string) { return (error instanceof ApiInputError || error instanceof ApiClientError) && error.details.some((item) => item.field === `body.${name}`); }
function AccountScenario({ store, state }: { store: WorkflowResultsStore; state: WorkflowResultsState }) {
  return <div className={styles.resultPanel}>
    <ReadStatus value={state.analysis} label="analysis" onRetry={() => void store.refreshContext()} /><ReadStatus value={state.scenario} label="scenario" onRetry={() => void store.refreshContext()} />
    {state.analysis.data && state.scenario.data && <ScenarioEditor store={store} state={state} />}
  </div>;
}
function ScenarioEditor({ store, state }: { store: WorkflowResultsStore; state: WorkflowResultsState }) {
  const analysis = state.analysis.data!, saved = state.scenario.data!;
  const currentContext = scenarioEditContext(analysis, saved);
  const isCurrent = saved.state === "ready" && saved.scenario !== null && saved.scenario.analysis_id === analysis.analysis?.id && saved.scenario.baseline_version === analysis.current_baseline_version;
  const seed = () => isCurrent && saved.scenario ? Object.fromEntries(scenarioFields.map(([key]) => [key, String(saved.scenario![key])])) as ScenarioFields : blankScenario();
  const [fields, setFields] = useState<ScenarioFields>(seed);
  const [base, setBase] = useState(currentContext);
  const [error, setError] = useState<unknown>(null);
  const [reconcile, setReconcile] = useState(false);
  const [notice, setNotice] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const effectiveBase = base ?? currentContext;
  const changedContext = base !== null && currentContext !== null && JSON.stringify(base) !== JSON.stringify(currentContext);
  const blocked = !currentContext || changedContext || reconcile || state.needsRead.scenario || state.contextError !== null || state.analysis.error !== null || state.scenario.error !== null || state.analysis.loading || state.scenario.loading;
  return <>
    <h3>Scenario assumptions</h3><p className={styles.formNote}>All five assumptions start blank for a new scenario. Saving uses the exact current analysis and baseline. Calculations, negative values, null payback and priority come only from the backend.</p>
    {!currentContext && <p>Resolve the analysis state before saving: {analysis.state.replaceAll("_", " ")}. No reduction or savings is assumed.</p>}
    {(changedContext || reconcile || state.needsRead.scenario) && <section className={styles.formNote} aria-label="Scenario reconciliation"><h4>Review saved context before another save</h4><p>Your entered assumptions are retained. The baseline, analysis or saved scenario may have changed. Refetch before reconciling; an uncertain PUT may already have saved.</p>
      <button type="button" className={styles.secondary} disabled={state.analysis.loading || state.scenario.loading} onClick={() => void store.refreshContext()}>Refetch scenario context</button>
      {currentContext && !state.needsRead.scenario && !state.scenario.error && !state.analysis.error && <><p>Latest analysis ID: {currentContext.analysis_id}. Baseline v{currentContext.baseline_version}. {currentContext.expected_updated_at === null ? "First save for this analysis: expected timestamp is null." : `Latest exact saved timestamp: ${currentContext.expected_updated_at}`}</p>
        {saved.scenario && <p>Latest saved assumptions: reduction {saved.scenario.reduction_percent}%; setup {saved.scenario.setup_hours} hours + {money(saved.scenario.setup_fees)} fees; tools {money(saved.scenario.monthly_tool_fees)}/month; upkeep {saved.scenario.monthly_maintenance_hours} hours/month. {isCurrent ? "Current analysis." : "Prior analysis/history only."}</p>}
        <button type="button" className={styles.secondary} onClick={() => { setBase(currentContext); setReconcile(false); setError(null); setNotice("Latest context accepted. Review your retained assumptions, then save explicitly."); }}>Use latest context; keep my assumptions for review</button></>}
    </section>}
    <button type="button" className={styles.secondary} disabled={state.operation !== null} onClick={() => { setFields(seed()); setBase(currentContext); setReconcile(false); setError(null); setNotice("Draft reset from the current saved scenario, or blank when none is current."); }}>Discard draft and load current saved assumptions</button>
    <form className={styles.form} noValidate onSubmit={async (event) => {
      event.preventDefault(); if (blocked || state.operation !== null || !effectiveBase) return; setNotice("");
      try {
        const input = scenarioSaveBody({ ...Object.fromEntries(scenarioFields.map(([key]) => [key, numeric(fields[key])])), ...effectiveBase } as ApiScenarioSaveInput);
        const response = await store.saveScenario(input);
        const record = response.scenario!;
        setBase({ baseline_version: response.current_baseline_version, analysis_id: record.analysis_id, expected_updated_at: record.updated_at });
        setError(null); setNotice("Scenario saved by the backend. ROI and priority below are authoritative.");
      } catch (failure) {
        if (failure instanceof AccountChangedError) return;
        setError(failure); if (failure instanceof ApiClientError && (failure.status === 409 || failure.kind === "network" || failure.kind === "protocol" || Number(failure.status) >= 500)) setReconcile(true);
        requestAnimationFrame(() => errorRef.current?.focus());
      }
    }}>
      {(error ?? state.errors.scenario) !== null && <div ref={errorRef} tabIndex={-1}><FailureNotice context="scenario" error={error ?? state.errors.scenario} onReview={() => void store.refreshContext()} /></div>}
      <div className={styles.twoColumns}>{scenarioFields.map(([key, label, max, hint]) => <div key={key}><label htmlFor={`account-${key}`}>{label}</label><input id={`account-${key}`} required type="number" step="any" min={0} max={max} value={fields[key]} aria-invalid={fieldInvalid(error, key)} aria-describedby={`account-${key}-hint`} onChange={(event) => { setFields((old) => ({ ...old, [key]: event.target.value })); setBase(effectiveBase); setNotice(""); }} /><small id={`account-${key}-hint`}>{hint} Range: 0–{max.toLocaleString("en-US")}.</small></div>)}</div>
      <button className={styles.primary} type="submit" disabled={blocked || state.operation !== null}>{state.operation === "scenario" ? "Saving scenario…" : "Save scenario to account"}</button><p role="status">{notice}</p>
    </form>
    {saved.scenario && <details><summary>Saved scenario context and exact timestamp</summary><p>Baseline v{saved.scenario.baseline_version}; analysis {saved.scenario.analysis_id}; source {saved.scenario.assumption_source}. Saved timestamp: <code>{saved.scenario.updated_at}</code>.</p></details>}
    <p>Server scenario state: <strong>{saved.state.replaceAll("_", " ")}</strong>{!isCurrent && saved.scenario ? " · Not a current estimate for this analysis." : ""}</p>
    {saved.roi ? <ServerROI roi={saved.roi} stale={!isCurrent} /> : <p className={styles.empty}>No backend estimate yet. No savings assumed.</p>}
  </>;
}

const measurementFields = [
  ["production_and_review_hours_after", "Production and review hours after", 744, "Include corrections/review; exclude upkeep."],
  ["maintenance_hours_after", "Maintenance hours after", 744, "Upkeep only, separate from production/review."],
  ["monthly_tools_and_fees", "Monthly tools and fees (USD)", 1_000_000, "Exclude maintenance labor."],
  ["initial_implementation_cost", "Initial implementation cost (USD)", 1_000_000, "One inclusive total of setup labor plus fees."],
] as const;
function AccountMeasurements({ store, state }: { store: WorkflowResultsStore; state: WorkflowResultsState }) {
  const [version, setVersion] = useState("");
  const [period, setPeriod] = useState("");
  const [fields, setFields] = useState<Record<typeof measurementFields[number][0], string>>({ production_and_review_hours_after: "", maintenance_hours_after: "", monthly_tools_and_fees: "", initial_implementation_cost: "" });
  const [demo, setDemo] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);
  const selected = state.baselines.items.find((item) => String(item.baseline_version) === version);
  const outcomes = state.comparisons.data?.measurements ?? [];
  const baselineError = state.baselines.error, measurementError = state.measurements.error;
  return <div className={styles.resultPanel}>
    <h3>Record an observation</h3><p className={styles.formNote}>Deliberately select the original baseline and month. Historical entries keep that version&apos;s time and labor cost. Production/review, upkeep, fees and inclusive setup are separate; no combined agency outcome is migrated.</p>
    {baselineError !== null && <FailureNotice error={baselineError} />}{state.baselines.loading && <p role="status">Loading original baselines…</p>}
    <button className={styles.secondary} disabled={state.baselines.loading} onClick={() => void store.loadBaselines()}>Refresh original baselines</button>{state.baselines.cursor && <button className={styles.secondary} disabled={state.baselines.loading} onClick={() => void store.loadBaselines(true)}>Load more baselines</button>}
    <form className={styles.form} noValidate onSubmit={async (event) => {
      event.preventDefault(); if (state.operation !== null || state.needsRead.measurement) return; setNotice("");
      try {
        if (!selected) throw new ApiInputError("baseline_version", "Deliberately select an available original baseline.");
        const input = measurementInputBody({ baseline_version: selected.baseline_version, period, production_and_review_hours_after: numeric(fields.production_and_review_hours_after), maintenance_hours_after: numeric(fields.maintenance_hours_after), monthly_tools_and_fees: numeric(fields.monthly_tools_and_fees), initial_implementation_cost: numeric(fields.initial_implementation_cost), is_demo: demo });
        await store.saveMeasurement(input); setError(null); setNotice("Observation saved with its selected original baseline. It remains hypothetical or self-reported, not verified business savings.");
      } catch (failure) { if (!(failure instanceof AccountChangedError)) { setError(failure); requestAnimationFrame(() => errorRef.current?.focus()); } }
    }}>
      {(error ?? state.errors.measurement) !== null && <div ref={errorRef} tabIndex={-1}><FailureNotice context="measurement" error={error ?? state.errors.measurement} onReview={() => void store.reconcileMeasurement()} /></div>}
      <div className={styles.twoColumns}><div><label htmlFor="account-measurement-baseline">Original baseline version</label><select id="account-measurement-baseline" required value={version} onChange={(event) => { setVersion(event.target.value); setNotice(""); }}><option value="">Select the original baseline deliberately</option>{state.baselines.items.map((item) => <option key={item.baseline_version} value={item.baseline_version}>v{item.baseline_version}{item.baseline_version === state.workflow.baseline_version ? " — Current" : " — Historical"}</option>)}</select></div>
        <div><label htmlFor="account-measurement-month">Measurement month (YYYY-MM)</label><input id="account-measurement-month" required maxLength={7} value={period} placeholder="YYYY-MM" aria-invalid={fieldInvalid(error, "period")} onChange={(event) => { setPeriod(event.target.value); setNotice(""); }} /></div></div>
      {selected && <p className={styles.formNote}>Selected original baseline v{selected.baseline_version}: {selected.snapshot.hours_per_occurrence} hours × {selected.snapshot.occurrences_per_month}/month at {money(selected.snapshot.hourly_cost)}/hour. These original values will be used, even after the current workflow changes.</p>}
      <div className={styles.twoColumns}>{measurementFields.map(([key, label, max, hint]) => <div key={key}><label htmlFor={`account-measured-${key}`}>{label}</label><input id={`account-measured-${key}`} required type="number" step="any" min={0} max={max} value={fields[key]} aria-invalid={fieldInvalid(error, key)} aria-describedby={`account-measured-${key}-hint`} onChange={(event) => { setFields((old) => ({ ...old, [key]: event.target.value })); setNotice(""); }} /><small id={`account-measured-${key}-hint`}>{hint}</small></div>)}</div>
      <label className={styles.checkLabel}><input type="checkbox" checked={demo} onChange={(event) => { setDemo(event.target.checked); setNotice(""); }} />This is hypothetical demo data</label><p>{demo ? "Hypothetical observation, not a real-world outcome." : "Self-reported outcome, not independently verified."}</p>
      <button className={styles.primary} type="submit" disabled={state.operation !== null || state.needsRead.measurement}>{state.operation === "measurement" ? "Saving observation…" : "Save measurement to account"}</button><p role="status">{notice}</p>
    </form>
    {state.needsRead.measurement && <p className={styles.formNote}>Check all saved measurement pages before retrying an uncertain write. A duplicate month/version cannot overwrite the original.</p>}
    <button className={styles.secondary} disabled={state.measurements.loading} onClick={() => void store.reconcileMeasurement()}>Refetch measurement history and check outcome</button>
    <h3>Measurement history</h3>{measurementError !== null && <FailureNotice error={measurementError} />}{state.measurements.loading && <p role="status">Loading measurement records…</p>}
    {state.measurements.loaded && !state.measurements.error && !state.measurements.items.length && <p className={styles.empty}>Not measured yet.</p>}
    <ul className={styles.history}>{state.measurements.items.map((item) => {
      const comparison = outcomes.find((row) => row.measurement.id === item.id);
      const original = state.baselines.items.find((row) => row.baseline_version === item.baseline_version)?.snapshot;
      return <li key={item.id}><strong>{item.period} · Baseline v{item.baseline_version} · {item.is_demo ? "Hypothetical" : "Self-reported, unverified"}</strong><span>Production/review {item.production_and_review_hours_after} hrs; maintenance {item.maintenance_hours_after} hrs; tool fees {money(item.monthly_tools_and_fees)}; inclusive initial cost {money(item.initial_implementation_cost)}.</span>
        {comparison ? <MeasurementComparison value={comparison} /> : <p>{original ? `Original inputs: ${original.hours_per_occurrence} hours × ${original.occurrences_per_month}/month at ${money(original.hourly_cost)}/hour.` : "Load the matching original baseline; no current-baseline substitution is made."} Backend comparison unavailable; no local savings calculation is substituted.</p>}
      </li>;
    })}</ul>{state.measurements.cursor && <button className={styles.secondary} disabled={state.measurements.loading} onClick={() => void store.loadMeasurements(true)}>Load more measurements</button>}
    <ReadStatus value={state.comparisons} label="measurement comparisons" onRetry={() => void store.loadComparisons()} />
  </div>;
}
function AccountHistory({ store, state }: { store: WorkflowResultsStore; state: WorkflowResultsState }) {
  const [version, setVersion] = useState("");
  const historical = state.historicalScenario;
  return <div className={styles.resultPanel}><h3>Saved inputs</h3><p>{state.workflow.description}</p><dl>{([
    ["Current baseline", `v${state.workflow.baseline_version}`], ["Time / frequency", `${state.workflow.hours_per_occurrence} hours × ${state.workflow.occurrences_per_month}/month`], ["Hourly cost", money(state.workflow.hourly_cost)], ["Current tools", state.workflow.current_tools], ["Pain points", state.workflow.pain_points], ["Risk", state.workflow.risk], ["Data availability", state.workflow.data_availability],
  ] as const).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Not specified"}</dd></div>)}</dl>
    <h3>Immutable original baselines</h3>{state.baselines.error !== null && <FailureNotice error={state.baselines.error} />}{state.baselines.loading && <p role="status">Loading baselines…</p>}
    <ul className={styles.history}>{state.baselines.items.map((item) => <li key={item.baseline_version}><strong>Baseline v{item.baseline_version}</strong><span>{item.snapshot.hours_per_occurrence} hours × {item.snapshot.occurrences_per_month}/month at {money(item.snapshot.hourly_cost)}/hour. Recorded {item.created_at}.</span></li>)}</ul>
    <button className={styles.secondary} disabled={state.baselines.loading} onClick={() => void store.loadBaselines()}>Refresh baseline history</button>{state.baselines.cursor && <button className={styles.secondary} disabled={state.baselines.loading} onClick={() => void store.loadBaselines(true)}>Load more baselines</button>}
    <h3>Read a historical scenario</h3><label className={styles.controlLabel} htmlFor="historical-scenario-version">Scenario history baseline</label><select className={styles.stateSelect} id="historical-scenario-version" value={version} onChange={(event) => { setVersion(event.target.value); if (event.target.value) void store.loadHistoricalScenario(Number(event.target.value)); }}><option value="">Select an existing baseline</option>{state.baselines.items.map((item) => <option key={item.baseline_version} value={item.baseline_version}>v{item.baseline_version}</option>)}</select>
    <ReadStatus value={historical} label="historical scenario" onRetry={() => { if (version) void store.loadHistoricalScenario(Number(version)); }} />
    {historical.data && <><p>Selected baseline v{state.historicalVersion} · {historical.data.state.replaceAll("_", " ")}. Historical reads are not editable current scenarios.</p>{historical.data.scenario && <p>Saved analysis {historical.data.scenario.analysis_id}; exact timestamp {historical.data.scenario.updated_at}; reduction assumption {historical.data.scenario.reduction_percent}%.</p>}{historical.data.roi ? <ServerROI roi={historical.data.roi} stale={historical.data.state !== "ready"} /> : <p>No saved scenario for this baseline.</p>}</>}
  </div>;
}
