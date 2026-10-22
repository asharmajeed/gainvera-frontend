import type { Assumptions, Outcome, Workflow } from "./models";
export function nonnegative(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
export function monthlyHours(hours: number, frequency: number) {
  return nonnegative(hours) * nonnegative(frequency);
}
export function calculateROI(
  w: Pick<Workflow, "hours" | "frequency" | "hourlyCost">,
  a: Assumptions,
) {
  const baseline = monthlyHours(w.hours, w.frequency);
  const rate = nonnegative(w.hourlyCost);
  const saved = (baseline * Math.min(100, nonnegative(a.reduction))) / 100;
  const gross = saved * rate;
  const maintenance = nonnegative(a.maintenanceHours) * rate;
  const recurring = nonnegative(a.monthlyTools) + maintenance;
  const net = gross - recurring;
  const initial = nonnegative(a.setupCost) + nonnegative(a.setupHours) * rate;
  return {
    baseline,
    saved,
    projected: baseline - saved,
    gross,
    recurring,
    maintenance,
    net,
    initial,
    firstMonth: net - initial,
    payback: net > 0 ? initial / net : null,
    capacity: saved - nonnegative(a.maintenanceHours),
  };
}
export function compareOutcome(
  w: Pick<Workflow, "hours" | "frequency" | "hourlyCost">,
  a: Assumptions,
  o?: Outcome,
) {
  const roi = calculateROI(w, a);
  if (!o) return null;
  const saved = roi.baseline - nonnegative(o.hours);
  const net = saved * nonnegative(w.hourlyCost) - nonnegative(o.monthlyCost);
  return {
    baseline: roi.baseline,
    estimatedHours: roi.projected,
    actualHours: nonnegative(o.hours),
    saved,
    variance: saved - roi.saved,
    net,
    firstMonth: net - nonnegative(o.implementationCost),
    payback: net > 0 ? nonnegative(o.implementationCost) / net : null,
  };
}
