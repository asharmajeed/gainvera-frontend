import { analyze } from "@/lib/analysis";
import type { Workflow } from "@/lib/models";
import { calculateROI, compareOutcome } from "@/lib/roi";
import { Badge, money, number } from "./ui";
export default function AuditReport({
  workflows,
  preview = false,
}: {
  workflows: Workflow[];
  preview?: boolean;
}) {
  const rows = workflows
    .filter((w) => w.analyzed)
    .map((w) => ({ w, a: analyze(w) }))
    .sort((a, b) => b.a.score - a.a.score);
  return (
    <section className={preview ? "audit-preview" : "print-report"}>
      <h1>Gainvera workflow audit</h1>
      <p>Smarter workflows. Proven results.</p>
      <p>
        Local rule-based analysis · USD ·{" "}
        {new Intl.DateTimeFormat("en-GB", {
          dateStyle: "long",
          timeZone: "Asia/Karachi",
        }).format(new Date())}
      </p>
      <p>
        Sample records and all savings scenarios are illustrative. Dollar values
        reflect capacity, not confirmed cash savings. Follow-up measurements are
        self-reported and not independently verified.
      </p>
      <p>
        Scoring: 35% value + 30% feasibility + 15% data readiness + 20% safety.
        TF-IDF cosine similarity retrieves curated playbooks; this is not
        trained predictive ML. Leave-alone tasks score 0.
      </p>
      {rows.map(({ w, a }) => {
        const assumptions = w.assumptions ?? a.defaultAssumptions;
        const roi = calculateROI(w, assumptions);
        const actual = compareOutcome(w, assumptions, w.outcome);
        return (
          <article key={w.id}>
            <h2>{w.name}</h2>
            <p>
              {w.business} ·{" "}
              {w.sample
                ? "Illustrative sample workflow"
                : "User-entered workflow"}
            </p>
            <Badge category={a.category} />
            <p>
              Score: {a.score}/100 · Risk: {a.risk} · Data: {w.data} ·
              Difficulty: {a.playbook.difficulty}/100
            </p>
            <p>{w.description}</p>
            <p>
              Tools: {w.tools || "Not specified"}. Pain points:{" "}
              {w.painPoints || "Not specified"}.
            </p>
            <p>{a.explanation}</p>
            <table>
              <tbody>
                {[
                  [
                    "Baseline",
                    `${w.hours} h × ${w.frequency} = ${number(roi.baseline)} h/month`,
                  ],
                  ["Hourly cost", money(w.hourlyCost)],
                  ["Scenario reduction", `${assumptions.reduction}%`],
                  ["Projected hours after", `${number(roi.projected)} h`],
                  ["Gross hours saved", `${number(roi.saved)} h`],
                  ["Gross capacity value", money(roi.gross)],
                  [
                    "Recurring tools + maintenance",
                    `${money(roi.recurring)} (${money(assumptions.monthlyTools)} tools + ${number(assumptions.maintenanceHours)} upkeep hours)`,
                  ],
                  ["Net monthly value", money(roi.net)],
                  [
                    "Setup assumptions",
                    `${number(assumptions.setupHours)} hours + ${money(assumptions.setupCost)} fees`,
                  ],
                  ["Initial investment", money(roi.initial)],
                  ["First-month net", money(roi.firstMonth)],
                  [
                    "Payback",
                    roi.payback === null
                      ? "No positive payback"
                      : `${number(roi.payback)} months`,
                  ],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Implementation</h3>
            <p>{a.playbook.strategy}</p>
            <ol>
              {a.playbook.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p>
              <b>Approaches:</b> {a.playbook.tools.join("; ")}
            </p>
            <p>
              <b>Template:</b> {a.playbook.template}
            </p>
            <p>
              <b>Human review:</b> {a.playbook.review}
            </p>
            <p>
              <b>Risks:</b> {a.playbook.risks}
            </p>
            <p>
              <b>Success measure:</b> {a.playbook.measure}
            </p>
            <h3>Follow-up results</h3>
            {actual ? (
              <p>
                {w.outcome?.demo ? "Hypothetical demo data" : "Self-reported"} ·{" "}
                {w.outcome?.period}: {number(actual.actualHours)} hours after;{" "}
                {number(actual.saved)} hours saved; {number(actual.variance)} h
                difference from estimate. Reported monthly cost{" "}
                {money(w.outcome!.monthlyCost)}, implementation{" "}
                {money(w.outcome!.implementationCost)}, net monthly capacity
                value {money(actual.net)}. Not independently verified.
              </p>
            ) : (
              <p>Not measured yet.</p>
            )}
          </article>
        );
      })}
    </section>
  );
}
