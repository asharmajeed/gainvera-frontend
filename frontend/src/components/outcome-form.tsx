"use client";
import { useState } from "react";
import type { Assumptions, Outcome, Workflow } from "@/lib/models";
import { compareOutcome } from "@/lib/roi";
import { money, number } from "./ui";
export default function OutcomeForm({
  workflow,
  assumptions,
  onSave,
  onClear,
}: {
  workflow: Workflow;
  assumptions: Assumptions;
  onSave: (o: Outcome) => void;
  onClear: () => void;
}) {
  const [hours, setHours] = useState(
    workflow.outcome ? String(workflow.outcome.hours) : "",
  );
  const [setup, setSetup] = useState(
    workflow.outcome ? String(workflow.outcome.implementationCost) : "",
  );
  const [cost, setCost] = useState(
    workflow.outcome ? String(workflow.outcome.monthlyCost) : "",
  );
  const [period, setPeriod] = useState(workflow.outcome?.period ?? "");
  const [demo, setDemo] = useState(workflow.outcome?.demo ?? workflow.sample);
  const [error, setError] = useState("");
  const comparison = compareOutcome(workflow, assumptions, workflow.outcome);
  return (
    <div className="outcome-content">
      <div className="notice">
        Include production, correction, and review time in reported hours.
        Include tool and maintenance costs in monthly cost. Compare equivalent
        monthly work volumes.
      </div>
      {comparison ? (
        <div className="comparison">
          <div>
            <span>Baseline</span>
            <strong>{number(comparison.baseline)} h</strong>
          </div>
          <div>
            <span>Estimated after</span>
            <strong>{number(comparison.estimatedHours)} h</strong>
          </div>
          <div>
            <span>Reported after</span>
            <strong>{number(comparison.actualHours)} h</strong>
          </div>
          <div>
            <span>Reported savings</span>
            <strong>{number(comparison.saved)} h</strong>
          </div>
          <p>
            {workflow.outcome?.demo
              ? "Hypothetical demo measurement"
              : "Self-reported measurement"}{" "}
            · {workflow.outcome?.period}
            <br />
            {number(comparison.variance)} h difference from estimate ·{" "}
            {money(comparison.net)} reported net capacity value / month. Not
            independently verified.
          </p>
        </div>
      ) : (
        <div className="unmeasured">
          <strong>Not measured yet</strong>
          <p>
            Estimated savings become evidence only after a comparable follow-up
            measurement.
          </p>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            [hours, setup, cost].some(
              (x) => !x.trim() || !Number.isFinite(Number(x)) || Number(x) < 0,
            ) ||
            !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)
          ) {
            setError(
              "Enter nonnegative values and a measurement month in YYYY-MM format.",
            );
            return;
          }
          onSave({
            hours: Number(hours),
            implementationCost: Number(setup),
            monthlyCost: Number(cost),
            period,
            demo,
          });
          setError("");
        }}
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-grid">
          <label>
            Actual monthly hours after
            <input
              required
              type="number"
              min={0}
              step="any"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </label>
          <label>
            Actual implementation cost ($)
            <input
              required
              type="number"
              min={0}
              step="any"
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
            />
          </label>
          <label>
            Actual monthly tools + maintenance ($)
            <input
              required
              type="number"
              min={0}
              step="any"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </label>
          <label>
            Measurement month
            <input
              required
              type="text"
              placeholder="YYYY-MM, e.g. 2026-10"
              maxLength={7}
              pattern="[0-9]{4}-(0[1-9]|1[0-2])"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            />
          </label>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={demo}
            onChange={(e) => setDemo(e.target.checked)}
          />{" "}
          This is hypothetical demo data
        </label>
        <div className="form-footer">
          {workflow.outcome && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                onClear();
                setHours("");
                setSetup("");
                setCost("");
                setPeriod("");
              }}
            >
              Clear measurement
            </button>
          )}
          <button className="button primary" type="submit">
            Save measurement
          </button>
        </div>
      </form>
    </div>
  );
}
