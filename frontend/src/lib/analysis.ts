import type { Analysis, Workflow } from "./models";
import { fallback, playbooks } from "./playbooks";
import { matchText } from "./similarity";
import { calculateROI, monthlyHours } from "./roi";
export function analyze(w: Workflow): Analysis {
  const text = `${w.name} ${w.description} ${w.painPoints}`;
  const match = matchText(
    text,
    playbooks.map((p) => p.corpus),
  );
  const sensitiveDecision =
    /\b(payment|financial|investment|legal|contract|bank transfer|credit)\b/i.test(
      text,
    ) && /\b(approv\w*|decision|authorize|authorise)\b/i.test(text);
  const matched = match.similarity >= 0.16 && w.description.trim().length >= 8;
  const p = sensitiveDecision
    ? playbooks.find((p) => p.id === "approval")!
    : w.risk === "high"
      ? {
          ...fallback,
          name: "Sensitive workflow",
          strategy: "Retain human control and assess the sensitivity first.",
          why: "Declared high sensitivity requires a human-led review before changing this process.",
          review:
            "An accountable process owner reviews every decision and any proposed change.",
          risks:
            "Privacy exposure, unauthorized decisions, and unclear responsibility.",
        }
      : matched
        ? playbooks[match.index]
        : fallback;
  const risk = sensitiveDecision || p.id === "approval" ? "high" : w.risk;
  const burden = monthlyHours(w.hours, w.frequency);
  const repetitiveness = Math.min(100, w.frequency * 8);
  const evidence = w.data === "digital" ? 100 : w.data === "manual" ? 35 : 20;
  const safety =
    risk === "low" ? 100 : risk === "medium" ? 55 : risk === "high" ? 0 : 30;
  const feasibility = Math.round(
    (100 - p.difficulty) * 0.65 + repetitiveness * 0.35,
  );
  const eligible = risk !== "high" && matched && burden >= 2;
  const defaults = {
    reduction: eligible ? p.reduction : 0,
    setupHours: eligible ? p.setup : 0,
    setupCost: 0,
    monthlyTools: eligible ? p.toolsCost : 0,
    maintenanceHours: eligible && p.reduction ? 0.5 : 0,
  };
  const roi = calculateROI(w, w.assumptions ?? defaults);
  const value = Math.min(100, Math.max(0, roi.net) / 5);
  let category = p.category;
  if (risk === "high" || !matched || burden < 2) category = "LEAVE ALONE";
  else if (
    category === "AUTOMATE NOW" &&
    (risk !== "low" || w.data !== "digital")
  )
    category = "SIMPLIFY WITHOUT AI";
  const score =
    category === "LEAVE ALONE"
      ? 0
      : Math.round(
          value * 0.35 + feasibility * 0.3 + evidence * 0.15 + safety * 0.2,
        );
  const explanation =
    risk === "high"
      ? "High sensitivity blocks automatic action. Keep an accountable human in control; consider administrative preparation separately."
      : !matched
        ? fallback.why
        : burden < 2
          ? "The current workload is below two hours per month. First confirm that implementation effort is justified."
          : p.category === "AUTOMATE NOW" && category !== "AUTOMATE NOW"
            ? "Full automation requires confirmed low risk and digital inputs. Start by documenting rules and access."
            : p.why;
  return {
    category,
    taskCategory: p.name,
    score,
    similarity: match.similarity,
    matched,
    playbook: p,
    risk,
    repetitiveness,
    feasibility,
    evidence,
    value,
    safety,
    explanation,
    defaultAssumptions: defaults,
  };
}
export function validateWorkflow(w: Workflow): string[] {
  const errors: string[] = [];
  if (!w.business.trim()) errors.push("Enter a business name.");
  if (!w.name.trim()) errors.push("Enter a workflow name.");
  if (w.description.trim().length < 8)
    errors.push("Describe the task in at least 8 characters.");
  for (const key of ["hours", "frequency", "hourlyCost"] as const)
    if (!Number.isFinite(w[key]) || w[key] < 0)
      errors.push(`${key} must be a finite, nonnegative number.`);
  if (w.hours > 744) errors.push("Hours per occurrence cannot exceed 744.");
  if (w.frequency > 10000)
    errors.push("Monthly frequency cannot exceed 10,000.");
  if (w.hourlyCost > 100000) errors.push("Hourly cost cannot exceed $100,000.");
  if (!["unknown", "low", "medium", "high"].includes(w.risk))
    errors.push("Choose a valid risk level.");
  if (!["unknown", "digital", "manual"].includes(w.data))
    errors.push("Choose a valid data availability.");
  return errors;
}
