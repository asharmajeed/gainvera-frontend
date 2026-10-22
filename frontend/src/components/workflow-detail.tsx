"use client";
import { useState } from "react";
import { ArrowRight, Check, Copy, ShieldCheck } from "lucide-react";
import type { Assumptions, Workflow } from "@/lib/models";
import { analyze } from "@/lib/analysis";
import { calculateROI } from "@/lib/roi";
import { Badge, Modal, money, number } from "./ui";
import OutcomeForm from "./outcome-form";
export default function WorkflowDetail({
  workflow,
  onChange,
  onClose,
  initialTab = "plan",
}: {
  workflow: Workflow;
  onChange: (w: Workflow) => void;
  onClose: () => void;
  initialTab?: string;
}) {
  const [tab, setTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);
  const a = analyze(workflow);
  const assumptions = workflow.assumptions ?? a.defaultAssumptions;
  const roi = calculateROI(workflow, assumptions);
  const p = a.playbook;
  function change(k: keyof Assumptions, v: number) {
    if (!Number.isFinite(v)) return;
    onChange({
      ...workflow,
      assumptions: {
        ...assumptions,
        [k]: Math.max(0, Math.min(k === "reduction" ? 100 : 1000000, v)),
      },
    });
  }
  return (
    <Modal
      title={workflow.name}
      subtitle={`${workflow.business} · ${number(roi.baseline)} hours / month · ${workflow.sample ? "Illustrative example" : "Your workflow"}`}
      onClose={onClose}
      wide
    >
      <div className="detail-summary">
        <Badge category={a.category} />
        <span className="score-inline">
          Opportunity score{" "}
          <b>
            {a.score}
            <small>/100</small>
          </b>
        </span>
        <span className="method-label">Local Rule-Based Analysis</span>
      </div>
      <div className="tabs">
        {[
          ["plan", "Recommendation"],
          ["roi", "ROI calculator"],
          ["results", "Track results"],
          ["score", "Why this score?"],
        ].map(([k, label]) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="detail-body">
        {tab === "plan" && (
          <>
            <div className="strategy">
              <span className="eyebrow">RECOMMENDED STRATEGY</span>
              <h3>{p.strategy}</h3>
              <p>{a.explanation}</p>
            </div>
            <div className="detail-columns">
              <div>
                <h4>Implementation plan</h4>
                <ol className="steps">
                  {p.steps.map((s, i) => (
                    <li key={s}>
                      <span>{i + 1}</span>
                      <p>{s}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <aside className="plan-aside">
                <h4>Suggested approaches</h4>
                {p.tools.map((t) => (
                  <p key={t} className="tool-line">
                    <Check size={15} />
                    {t}
                  </p>
                ))}
                <h4>
                  <ShieldCheck size={16} /> Human review
                </h4>
                <p>{p.review}</p>
                <h4>Risks & limitations</h4>
                <p>{p.risks}</p>
                <h4>Measure success</h4>
                <p>{p.measure}</p>
              </aside>
            </div>
            <div className="template">
              <div>
                <h4>Ready-to-use prompt or template</h4>
                <button
                  className="button text"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(p.template);
                      setCopied(true);
                    } catch {
                      setCopied(false);
                    }
                  }}
                >
                  <Copy size={14} />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p>{p.template}</p>
            </div>
            <button className="button primary" onClick={() => setTab("roi")}>
              Explore the ROI <ArrowRight size={16} />
            </button>
          </>
        )}
        {tab === "roi" && (
          <>
            <div className="notice">
              <strong>Scenario assumptions, not predictions.</strong> Suggested
              starting percentages come from curated examples, without validated
              outcome data. Include all review/correction time in the reduction.
              Dollar values represent capacity; cash savings require a real
              reduction in spending.
            </div>
            <div className="roi-layout">
              <div className="assumptions">
                <h3>Make the assumptions yours</h3>
                <label>
                  Expected time reduction <b>{assumptions.reduction}%</b>
                  <input
                    aria-label="Expected time reduction"
                    type="range"
                    min={0}
                    max={100}
                    value={assumptions.reduction}
                    onChange={(e) =>
                      change("reduction", Number(e.target.value))
                    }
                  />
                </label>
                <div className="form-grid">
                  {(
                    [
                      ["setupHours", "Setup hours"],
                      ["setupCost", "Setup fees ($)"],
                      ["monthlyTools", "Monthly tool subscription ($)"],
                      ["maintenanceHours", "Monthly maintenance hours"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k}>
                      {label}
                      <input
                        type="number"
                        min={0}
                        max={1000000}
                        step="any"
                        value={assumptions[k]}
                        onChange={(e) => change(k, Number(e.target.value))}
                      />
                    </label>
                  ))}
                </div>
                <p className="muted">
                  Hourly cost: {money(workflow.hourlyCost)} · baseline:{" "}
                  {workflow.hours} h × {workflow.frequency} / month
                </p>
              </div>
              <div className="roi-result">
                <span>Estimated ongoing net monthly value</span>
                <strong>{money(roi.net)}</strong>
                <p>{number(roi.saved)} gross hours potentially saved</p>
                <dl>
                  <div>
                    <dt>Gross capacity value</dt>
                    <dd>{money(roi.gross)}</dd>
                  </div>
                  <div>
                    <dt>Recurring tools + upkeep</dt>
                    <dd>− {money(roi.recurring)}</dd>
                  </div>
                  <div>
                    <dt>Initial investment</dt>
                    <dd>{money(roi.initial)}</dd>
                  </div>
                  <div>
                    <dt>First-month net value</dt>
                    <dd>{money(roi.firstMonth)}</dd>
                  </div>
                  <div>
                    <dt>Payback</dt>
                    <dd>
                      {roi.payback === null
                        ? "No positive payback"
                        : `${number(roi.payback)} months`}
                    </dd>
                  </div>
                  <div>
                    <dt>Capacity after upkeep</dt>
                    <dd>{number(roi.capacity)} h / month</dd>
                  </div>
                </dl>
              </div>
            </div>
            <details className="formula">
              <summary>See the calculation formulas</summary>
              <p>
                Baseline = hours per occurrence × monthly occurrences
                <br />
                Hours saved = baseline × reduction ÷ 100
                <br />
                Gross value = hours saved × hourly cost
                <br />
                Net value = gross value − monthly tool costs − maintenance hours
                × hourly cost
                <br />
                Initial investment = setup fees + setup hours × hourly cost
                <br />
                First month = net value − initial investment
                <br />
                Payback = initial investment ÷ net value (only if positive)
              </p>
            </details>
          </>
        )}
        {tab === "results" && (
          <OutcomeForm
            workflow={workflow}
            assumptions={assumptions}
            onSave={(outcome) => onChange({ ...workflow, outcome })}
            onClear={() => onChange({ ...workflow, outcome: undefined })}
          />
        )}
        {tab === "score" && (
          <>
            <h3>Transparent inputs. A repeatable decision.</h3>
            <p>{a.explanation}</p>
            <div className="score-formula">
              35% value + 30% feasibility + 15% data readiness + 20% safety
            </div>
            <div className="score-list">
              {[
                [
                  "Potential value",
                  a.value,
                  "Net monthly scenario value ÷ $500, capped at 100.",
                ],
                [
                  "Feasibility",
                  a.feasibility,
                  `65% ease (${100 - p.difficulty}/100) + 35% repetition (${number(a.repetitiveness)}/100).`,
                ],
                [
                  "Data readiness",
                  a.evidence,
                  `${workflow.data === "unknown" ? "Not confirmed — conservative 20" : workflow.data === "digital" ? "User confirms digital inputs — 100" : "Manual inputs — 35"}/100.`,
                ],
                [
                  "Safety",
                  a.safety,
                  `Risk: ${a.risk}. Low 100 / medium 55 / high 0 / unknown 30.`,
                ],
              ].map(([label, val, help]) => (
                <div key={String(label)}>
                  <span>
                    {label}
                    <small>{help}</small>
                  </span>
                  <b>{number(Number(val))}/100</b>
                </div>
              ))}
            </div>
            <p className="notice">
              Leave-alone workflows receive a score of 0. High-risk decisions
              are blocked. Work below 2 hours/month requires more evidence. Full
              automation requires confirmed digital inputs and low risk.
            </p>
            <h4>Text-similarity evidence</h4>
            <p>
              {a.matched
                ? `${p.name} playbook matched at ${number(a.similarity * 100)}% cosine similarity.`
                : "No sufficiently close curated playbook match."}{" "}
              This is TF-IDF text matching, not a trained predictive AI model or
              a probability of success.
            </p>
            <p>
              Repetition: {number(a.repetitiveness)}/100 (monthly frequency × 8,
              capped at 100). Implementation difficulty: {p.difficulty}/100.
              Automation suitability: {a.category}. Savings evidence:
              unvalidated scenario assumption.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
