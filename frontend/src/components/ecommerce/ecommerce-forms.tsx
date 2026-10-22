"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ApiClientError, ApiInputError, workflowFromApi, workflowToCreateRequest, workspaceCreateBody,
} from "@/lib/api";
import type { ApiFieldIssue, ApiWorkflow, WorkflowDraft } from "@/lib/api";
import { Modal } from "../ui";
import { FailureNotice } from "./recommendation-view";
import styles from "./ecommerce-preview.module.css";

const labels: Record<string, string> = {
  name: "Workflow name", description: "Task description", hours_per_occurrence: "Hours per occurrence",
  occurrences_per_month: "Occurrences per month", hourly_cost: "Hourly labor cost",
  current_tools: "Current tools", pain_points: "Pain points", risk: "Risk", data_availability: "Data availability",
};

export function PreviewWorkflowForm({ record, workspaceId, onSave, onClose, mode = "fixture", notice, saveDisabled = false }: {
  record?: ApiWorkflow;
  workspaceId: string;
  onSave(draft: WorkflowDraft): void | Promise<void>;
  onClose(): void;
  mode?: "fixture" | "account";
  notice?: ReactNode;
  saveDisabled?: boolean;
}) {
  const seed = record ? workflowFromApi(record) : {
    name: "", description: "", hours: 1, frequency: 4, hourlyCost: 20,
    tools: "", painPoints: "", risk: "unknown" as const, data: "unknown" as const,
  };
  const [draft, setDraft] = useState({
    ...seed, sample: record?.is_sample ?? mode === "fixture", hours: String(seed.hours), frequency: String(seed.frequency), hourlyCost: String(seed.hourlyCost),
  });
  const [issues, setIssues] = useState<ApiFieldIssue[]>([]);
  const [failure, setFailure] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  function field(key: keyof typeof draft, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  const issue = (name: string) => issues.find((item) => item.field === `body.${name}`);
  function showError(error: unknown) {
    setFailure(error);
    setIssues(error instanceof ApiInputError || (error instanceof ApiClientError && error.details.length) ? error.details : [{
      field: "form", code: "preview_error", message: error instanceof Error ? error.message : "The preview could not save this workflow.",
    }]);
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || saveDisabled) return;
    const asNumber = (value: string) => value.trim() === "" ? NaN : Number(value);
    const input: WorkflowDraft = {
      ...draft, hours: asNumber(draft.hours), frequency: asNumber(draft.frequency),
      hourlyCost: asNumber(draft.hourlyCost), sample: draft.sample,
    };
    try {
      workflowToCreateRequest(input, workspaceId);
      setSaving(true); await onSave(input);
    } catch (error) { showError(error); }
    finally { setSaving(false); }
  }
  function inputError(name: string) {
    return issue(name) && <small id={`workflow-${name}-error`} className={styles.fieldError}>{issue(name)?.message}</small>;
  }
  const describedBy = (name: string) => `workflow-${name}-hint${issue(name) ? ` workflow-${name}-error` : ""}`;

  return <Modal title={mode === "account" ? record ? "Edit saved workflow" : "Add an account workflow" : record ? "Edit preview workflow" : "Add a preview workflow"}
    subtitle={mode === "account" ? "Real account storage · USD · no automatic analysis" : "Development fixtures · edits reset on leaving or reloading"} onClose={onClose} wide>
    <form noValidate onSubmit={submit} className={styles.form}>
      {notice}
      {mode === "account" && failure !== null ? <div ref={errorRef} tabIndex={-1}><FailureNotice error={failure} /></div> : issues.length > 0 && <div ref={errorRef} className={styles.error} role="alert" tabIndex={-1}>
        <strong>Check your input</strong>
        <ul>{issues.map((item) => <li key={item.field}>{labels[item.field.replace("body.", "")] ?? "Workflow"}: {item.message}</li>)}</ul>
      </div>}
      {record && <p className={styles.formNote}>You are editing baseline v{record.baseline_version}. Changed inputs create a new version and invalidate active analysis/scenarios. Historical measurements keep their original baseline.</p>}
      <label htmlFor="workflow-name">Workflow name <span>Required</span></label>
      <input id="workflow-name" required maxLength={100} value={draft.name}
        aria-invalid={!!issue("name")} aria-describedby={describedBy("name")}
        placeholder="e.g. Prepare the weekly order report" onChange={(e) => field("name", e.target.value)} />
      <small id="workflow-name-hint">1–100 characters.</small>{inputError("name")}
      <label htmlFor="workflow-description">What does the task involve? <span>Required</span></label>
      <textarea id="workflow-description" required minLength={8} maxLength={3000} rows={4}
        value={draft.description} onChange={(e) => field("description", e.target.value)}
        aria-invalid={!!issue("description")} aria-describedby={describedBy("description")}
        placeholder="Describe the inputs, repeated steps, output and human review." />
      <small id="workflow-description-hint">8–3,000 characters. This form does not run analysis.</small>{inputError("description")}
      <div className={styles.formGrid}>
        {([
          ["hours", "hours_per_occurrence", "Hours per occurrence", 744, "Decimal hours, including production and review. 0.25 = 15 minutes."],
          ["frequency", "occurrences_per_month", "Occurrences per month", 10000, "Monthly average; fractional occurrences are allowed."],
          ["hourlyCost", "hourly_cost", "Hourly labor cost (USD)", 100000, "USD per hour. Capacity value is not guaranteed cash savings."],
        ] as const).map(([key, apiKey, label, max, hint]) => <div key={key}>
          <label htmlFor={`workflow-${apiKey}`}>{label}</label>
          <input id={`workflow-${apiKey}`} type="number" required min={0} max={max} step="any" inputMode="decimal"
            value={draft[key]} onChange={(e) => field(key, e.target.value)}
            aria-invalid={!!issue(apiKey)} aria-describedby={describedBy(apiKey)} />
          <small id={`workflow-${apiKey}-hint`}>{hint} Range: 0–{max.toLocaleString("en-US")}.</small>{inputError(apiKey)}
        </div>)}
      </div>
      <label htmlFor="workflow-current_tools">Current tools</label>
      <input id="workflow-current_tools" maxLength={300} value={draft.tools}
        onChange={(e) => field("tools", e.target.value)} aria-invalid={!!issue("current_tools")}
        aria-describedby={describedBy("current_tools")} placeholder="e.g. Order export and spreadsheet" />
      <small id="workflow-current_tools-hint">Optional, up to 300 characters.</small>{inputError("current_tools")}
      <label htmlFor="workflow-pain_points">Pain points</label>
      <input id="workflow-pain_points" maxLength={500} value={draft.painPoints}
        onChange={(e) => field("painPoints", e.target.value)} aria-invalid={!!issue("pain_points")}
        aria-describedby={describedBy("pain_points")} placeholder="What makes this work slow or difficult?" />
      <small id="workflow-pain_points-hint">Optional, up to 500 characters.</small>{inputError("pain_points")}
      <div className={styles.twoColumns}>
        <div><label htmlFor="workflow-risk">Risk</label>
          <select id="workflow-risk" value={draft.risk} onChange={(e) => field("risk", e.target.value)}>
            <option value="unknown">Unknown — not assessed</option><option value="low">Low</option>
            <option value="medium">Medium — review needed</option><option value="high">High — human decisions</option>
          </select>
          <small>Unknown is valid. Refund and dispute decisions stay with people.</small>
        </div>
        <div><label htmlFor="workflow-data">Data availability</label>
          <select id="workflow-data" value={draft.data} onChange={(e) => field("data", e.target.value)}>
            <option value="unknown">Unknown — not confirmed</option><option value="digital">Digital inputs confirmed</option>
            <option value="manual">Manual / unstructured inputs</option>
          </select><small>Do not mark digital readiness until the input is confirmed.</small>
        </div>
      </div>
      {mode === "account" && <label className={styles.checkLabel}><input type="checkbox" checked={draft.sample} onChange={(event) => setDraft((previous) => ({ ...previous, sample: event.target.checked }))} />Fictional sample input</label>}
      <footer className={styles.formFooter}><button type="button" className={styles.secondary} onClick={onClose}>Cancel</button>
        <button type="submit" disabled={saving || saveDisabled} className={styles.primary}>{saving ? "Saving…" : mode === "account" ? "Save account workflow" : "Save preview workflow"}</button></footer>
    </form>
  </Modal>;
}

export function PreviewWorkspaceForm({ onSave, onClose, mode = "fixture" }: { onSave(name: string): void | Promise<void>; onClose(): void; mode?: "fixture" | "account" }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [failure, setFailure] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const failureRef = useRef<HTMLDivElement>(null);
  return <Modal title={mode === "account" ? "Create an account workspace" : "Create a preview workspace"} subtitle={mode === "account" ? "Saved to your signed-in account" : "Local fixture workspace · no account or database record"} onClose={onClose}>
    <form noValidate className={styles.form} onSubmit={async (event) => {
      event.preventDefault();
      if (saving) return;
      try { const normalized = workspaceCreateBody({ name }).name; setSaving(true); await onSave(normalized); }
      catch (error) { setFailure(error); setError("Enter a store name from 1 to 100 characters, or check the request failure."); requestAnimationFrame(() => (mode === "account" ? failureRef.current : errorRef.current)?.focus()); }
      finally { setSaving(false); }
    }}>
      {mode === "account" && failure !== null ? <div ref={failureRef} tabIndex={-1}><FailureNotice error={failure} /></div> : error && <p ref={errorRef} role="alert" tabIndex={-1} className={styles.error}>{error}</p>}
      <p className={styles.formNote}>{mode === "account" ? "This creates a real workspace for your account. No fixture or agency records are uploaded." : "This workspace exists only while this preview is open. Leaving or reloading discards preview changes."}</p>
      <label htmlFor="workspace-name">Store name</label>
      <input id="workspace-name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)}
        aria-invalid={!!error} aria-describedby="workspace-name-hint" placeholder="e.g. Willow & Thread" />
      <small id="workspace-name-hint">Required, 1–100 characters.</small>
      <label htmlFor="workspace-currency">Currency</label><input id="workspace-currency" value="USD — US dollars" readOnly />
      <footer className={styles.formFooter}><button type="button" className={styles.secondary} onClick={onClose}>Cancel</button>
        <button type="submit" disabled={saving} className={styles.primary}>{saving ? "Saving…" : mode === "account" ? "Create account workspace" : "Create preview workspace"}</button></footer>
    </form>
  </Modal>;
}
