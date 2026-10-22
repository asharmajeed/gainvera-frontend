import test from "node:test";
import assert from "node:assert/strict";
import { analyze, validateWorkflow } from "../src/lib/analysis";
import { exampleWorkflows } from "../src/lib/fixtures";
import { calculateROI, compareOutcome, monthlyHours } from "../src/lib/roi";
import { matchText } from "../src/lib/similarity";
const base = exampleWorkflows[0];
const assumptions = {
  reduction: 50,
  setupHours: 5,
  setupCost: 50,
  monthlyTools: 25,
  maintenanceHours: 1,
};
test("demo workflows exercise all four recommendation categories", () => {
  assert.deepEqual(
    exampleWorkflows.map((w) => analyze(w).category),
    [
      "AI-ASSISTED",
      "AI-ASSISTED",
      "AI-ASSISTED",
      "SIMPLIFY WITHOUT AI",
      "LEAVE ALONE",
      "AUTOMATE NOW",
    ],
  );
});
test("monthly baseline handles zero, negative, and nonfinite input safely", () => {
  assert.equal(monthlyHours(3, 8), 24);
  assert.equal(monthlyHours(0, 8), 0);
  assert.equal(monthlyHours(-3, 8), 0);
  assert.equal(monthlyHours(NaN, 4), 0);
});
test("ROI accounts for setup, recurring tools, and maintenance", () => {
  const r = calculateROI(base, assumptions);
  assert.equal(r.baseline, 24);
  assert.equal(r.saved, 12);
  assert.equal(r.projected, 12);
  assert.equal(r.gross, 360);
  assert.equal(r.recurring, 55);
  assert.equal(r.net, 305);
  assert.equal(r.initial, 200);
  assert.equal(r.firstMonth, 105);
  assert.equal(r.payback, 200 / 305);
  assert.equal(r.capacity, 11);
});
test("negative outcomes have no positive payback", () => {
  const r = calculateROI(base, { ...assumptions, reduction: 0 });
  assert.equal(r.net, -55);
  assert.equal(r.payback, null);
  assert.equal(r.firstMonth, -255);
});
test("zero cost and zero hours do not cause division by zero", () => {
  const r = calculateROI(
    { ...base, hours: 0, hourlyCost: 0 },
    {
      reduction: 100,
      setupHours: 0,
      setupCost: 0,
      monthlyTools: 0,
      maintenanceHours: 0,
    },
  );
  assert.equal(r.net, 0);
  assert.equal(r.payback, null);
  assert.equal(r.saved, 0);
});
test("ROI clamps reductions and negative assumptions", () => {
  const r = calculateROI(base, {
    reduction: 150,
    setupHours: -2,
    setupCost: -2,
    monthlyTools: -1,
    maintenanceHours: -3,
  });
  assert.equal(r.saved, 24);
  assert.equal(r.initial, 0);
  assert.equal(r.recurring, 0);
});
test("outcomes are absent until entered and include overruns", () => {
  assert.equal(compareOutcome(base, assumptions), null);
  const o = compareOutcome(base, assumptions, {
    hours: 30,
    implementationCost: 100,
    monthlyCost: 40,
    period: "2026-10",
    demo: true,
  })!;
  assert.equal(o.saved, -6);
  assert.equal(o.variance, -18);
  assert.equal(o.net, -220);
  assert.equal(o.firstMonth, -320);
  assert.equal(o.payback, null);
});
test("estimated versus reported comparisons use the same baseline", () => {
  const o = compareOutcome(base, assumptions, {
    hours: 10,
    implementationCost: 100,
    monthlyCost: 40,
    period: "2026-10",
    demo: true,
  })!;
  assert.equal(o.estimatedHours, 12);
  assert.equal(o.saved, 14);
  assert.equal(o.variance, 2);
  assert.equal(o.net, 380);
});
test("unknown task uses evidence-gathering fallback rather than inventing savings", () => {
  const a = analyze({
    ...base,
    name: "Bespoke task",
    description: "Explore unusual ceramic glazing in a quiet studio.",
    painPoints: "",
  });
  assert.equal(a.matched, false);
  assert.equal(a.category, "LEAVE ALONE");
  assert.equal(a.defaultAssumptions.reduction, 0);
  assert.equal(a.score, 0);
});
test("sensitive financial approval overrides declared low risk", () => {
  const a = analyze({ ...exampleWorkflows[4], risk: "low" });
  assert.equal(a.category, "LEAVE ALONE");
  assert.equal(a.risk, "high");
  assert.equal(a.defaultAssumptions.reduction, 0);
});
test("unknown risk or data cannot authorize full automation", () => {
  const w = exampleWorkflows[5];
  assert.equal(
    analyze({ ...w, risk: "unknown" }).category,
    "SIMPLIFY WITHOUT AI",
  );
  assert.equal(
    analyze({ ...w, data: "unknown" }).category,
    "SIMPLIFY WITHOUT AI",
  );
  assert.equal(analyze({ ...w, data: "unknown" }).evidence, 20);
});
test("small workload is not automatically recommended", () => {
  assert.equal(
    analyze({ ...base, hours: 0.1, frequency: 1 }).category,
    "LEAVE ALONE",
  );
});
test("declared high risk gets a human-led plan and no default savings", () => {
  const a = analyze({ ...base, risk: "high" });
  assert.equal(a.category, "LEAVE ALONE");
  assert.equal(a.defaultAssumptions.reduction, 0);
  assert.match(a.playbook.strategy, /human control/);
});
test("validation rejects empty descriptions, negative and nonfinite values", () => {
  assert.ok(
    validateWorkflow({ ...base, description: "", hours: -1 }).length >= 2,
  );
  assert.ok(validateWorkflow({ ...base, hourlyCost: Infinity }).length);
  assert.deepEqual(validateWorkflow({ ...base, hours: 0, hourlyCost: 0 }), []);
});
test("text matching handles empty input and distinguishes different descriptions", () => {
  assert.deepEqual(matchText("", ["reporting", "files"]), {
    index: -1,
    similarity: 0,
  });
  assert.equal(
    matchText("files folders", ["client reporting", "files folders"]).index,
    1,
  );
});
test("ROI changes influence the ranking value component", () => {
  const lower = analyze({
    ...base,
    assumptions: { ...assumptions, reduction: 0 },
  });
  const higher = analyze({
    ...base,
    assumptions: { ...assumptions, reduction: 90 },
  });
  assert.ok(higher.score > lower.score);
});
