"use client";
import { useState } from "react";
import type { Workflow } from "@/lib/models";
import { validateWorkflow } from "@/lib/analysis";
import { Modal } from "./ui";
export default function WorkflowForm({
  workflow,
  business,
  onSave,
  onClose,
}: {
  workflow?: Workflow;
  business: string;
  onSave: (w: Workflow) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Workflow>(
    workflow ?? {
      id: crypto.randomUUID(),
      business,
      name: "",
      description: "",
      hours: 1,
      frequency: 4,
      hourlyCost: 30,
      tools: "",
      painPoints: "",
      risk: "unknown",
      data: "unknown",
      analyzed: false,
      sample: false,
    },
  );
  const [errors, setErrors] = useState<string[]>([]);
  const field = <K extends keyof Workflow>(key: K, value: Workflow[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  return (
    <Modal
      title={workflow ? "Edit workflow" : "Add a workflow"}
      subtitle="Start with the work your team actually does."
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const errors = validateWorkflow(draft);
          setErrors(errors);
          if (!errors.length)
            onSave({
              ...draft,
              analyzed: false,
              assumptions: undefined,
              outcome: undefined,
              sample: false,
            });
        }}
        className="form-body"
      >
        {errors.length > 0 && (
          <div role="alert" className="error">
            {errors.join(" ")}
          </div>
        )}
        {workflow && (
          <p className="notice">
            Saving edits clears this workflow’s previous analysis and
            measurements so the baseline stays consistent.
          </p>
        )}
        <label>
          Business name
          <input
            autoFocus
            required
            maxLength={100}
            value={draft.business}
            onChange={(e) => field("business", e.target.value)}
          />
        </label>
        <label>
          Workflow name
          <input
            required
            maxLength={100}
            placeholder="e.g. Weekly client reporting"
            value={draft.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </label>
        <label>
          What does the task involve?
          <textarea
            required
            minLength={8}
            maxLength={3000}
            rows={3}
            placeholder="Describe the inputs, repeated steps, and expected output…"
            value={draft.description}
            onChange={(e) => field("description", e.target.value)}
          />
        </label>
        <div className="form-grid three">
          {(
            [
              ["hours", "Hours / occurrence", 744],
              ["frequency", "Occurrences / month", 10000],
              ["hourlyCost", "Employee cost / hour ($)", 100000],
            ] as const
          ).map(([k, label, max]) => (
            <label key={k}>
              {label}
              <input
                type="number"
                required
                min={0}
                max={max}
                step="any"
                value={Number.isNaN(draft[k]) ? "" : draft[k]}
                onChange={(e) =>
                  field(k, e.target.value === "" ? NaN : Number(e.target.value))
                }
              />
            </label>
          ))}
        </div>
        <label>
          Current tools
          <input
            maxLength={300}
            placeholder="e.g. Sheets, analytics exports, Slides"
            value={draft.tools}
            onChange={(e) => field("tools", e.target.value)}
          />
        </label>
        <label>
          Pain points <span className="muted">(optional)</span>
          <input
            maxLength={500}
            placeholder="What makes this work slow or difficult?"
            value={draft.painPoints}
            onChange={(e) => field("painPoints", e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Sensitivity / risk
            <select
              value={draft.risk}
              onChange={(e) =>
                field("risk", e.target.value as Workflow["risk"])
              }
            >
              <option value="unknown">Not assessed</option>
              <option value="low">Low</option>
              <option value="medium">Medium — review needed</option>
              <option value="high">High — sensitive decisions</option>
            </select>
          </label>
          <label>
            Data availability
            <select
              value={draft.data}
              onChange={(e) =>
                field("data", e.target.value as Workflow["data"])
              }
            >
              <option value="unknown">Not confirmed</option>
              <option value="digital">Digital inputs confirmed</option>
              <option value="manual">Manual / unstructured inputs</option>
            </select>
          </label>
        </div>
        <footer className="form-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" type="submit">
            Save workflow
          </button>
        </footer>
      </form>
    </Modal>
  );
}
