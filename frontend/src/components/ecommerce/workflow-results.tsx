"use client";
import { useState } from "react";
import type { ApiMeasurementInput, ApiScenarioInput, ApiWorkflow } from "@/lib/api";
import type { PreviewState } from "@/lib/ecommerce/preview";
import type { LocalScenario } from "@/lib/ecommerce/results";
import { number } from "../ui";
import { RecommendationView } from "./recommendation-view";
import { MeasurementPanel, ScenarioPanel } from "./scenario-measurement";
import styles from "./ecommerce-preview.module.css";
const tabs = [["recommendation", "Recommendation"], ["scenario", "Scenario & ROI"], ["measurements", "Measurements"], ["inputs", "Inputs & history"]];

export function WorkflowResults({ state, workflow, onScenario, onMeasurement, onSignIn, onEdit, onClose }: {
  state: PreviewState; workflow: ApiWorkflow;
  onScenario(input: ApiScenarioInput, source: LocalScenario["assumptionSource"]): void;
  onMeasurement(input: ApiMeasurementInput): void;
  onSignIn(): void; onEdit(): void; onClose(): void;
}) {
  const [tab, setTab] = useState("recommendation");
  return <div className={styles.detail}>
    <div className={styles.resultTabs} role="tablist" aria-label="Workflow result sections" onKeyDown={(event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const index = tabs.findIndex(([id]) => id === tab);
      const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      setTab(tabs[next][0]); document.getElementById(`workflow-tab-${tabs[next][0]}`)?.focus();
    }}>
      {tabs.map(([id, label]) =>
        <button key={id} role="tab" tabIndex={tab === id ? 0 : -1} id={`workflow-tab-${id}`} aria-selected={tab === id} aria-controls={`workflow-panel-${id}`} onClick={() => setTab(id)}>{label}</button>)}
    </div>
    <section role="tabpanel" tabIndex={0} id={`workflow-panel-${tab}`} aria-labelledby={`workflow-tab-${tab}`}>
      {tab === "recommendation" && <RecommendationView state={state} workflow={workflow} onSignIn={onSignIn} onReview={() => setTab("inputs")} />}
      {tab === "scenario" && <ScenarioPanel state={state} workflow={workflow} onSave={onScenario} />}
      {tab === "measurements" && <MeasurementPanel state={state} workflow={workflow} onSave={onMeasurement} />}
      {tab === "inputs" && <div className={styles.resultPanel}>
        <span className={styles.pending}>{workflow.analysis_status.replaceAll("_", " ")}</span><p>{workflow.description}</p>
        <dl><div><dt>Current tools</dt><dd>{workflow.current_tools || "Not specified"}</dd></div><div><dt>Pain points</dt><dd>{workflow.pain_points || "Not specified"}</dd></div><div><dt>Risk</dt><dd>{workflow.risk === "unknown" ? "Unknown — not assessed" : workflow.risk}</dd></div><div><dt>Data availability</dt><dd>{workflow.data_availability === "unknown" ? "Unknown — not confirmed" : workflow.data_availability}</dd></div><div><dt>Hourly labor cost</dt><dd>USD {number(workflow.hourly_cost)} / hour</dd></div></dl>
        <p className={styles.formNote}>Baseline edits invalidate active analysis and the current scenario. Historical entries keep their original version; no combined legacy outcomes are migrated.</p>
        <h3>Baseline history</h3><ul className={styles.history}>{state.baselines.filter((item) => item.id === workflow.id).map((item) => <li key={item.baseline_version}><strong>v{item.baseline_version}{item.baseline_version === workflow.baseline_version ? " · Current" : " · Historical"}</strong><span>{number(item.hours_per_occurrence * item.occurrences_per_month)} hours/month · USD {number(item.hourly_cost)}/hour</span></li>)}</ul>
      </div>}
    </section>
    <div className={styles.formFooter}><button className={styles.secondary} onClick={onClose}>Close</button><button className={styles.primary} onClick={onEdit}>Edit workflow inputs</button></div>
  </div>;
}
