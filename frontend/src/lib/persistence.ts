import type { Workflow } from "./models";
import { validateWorkflow } from "./analysis";
const key = "gainvera-demo-v1";
export function loadWorkflows(): { workflows: Workflow[]; warning?: string } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { workflows: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw Error();
    const valid = parsed.filter((w): w is Workflow => {
      if (!w || typeof w !== "object") return false;
      for (const s of [
        "id",
        "business",
        "name",
        "description",
        "tools",
        "painPoints",
      ])
        if (typeof w[s] !== "string") return false;
      if (
        validateWorkflow(w).length ||
        typeof w.analyzed !== "boolean" ||
        typeof w.sample !== "boolean"
      )
        return false;
      if (
        w.assumptions &&
        (![
          "reduction",
          "setupHours",
          "setupCost",
          "monthlyTools",
          "maintenanceHours",
        ].every(
          (k) => Number.isFinite(w.assumptions[k]) && w.assumptions[k] >= 0,
        ) ||
          w.assumptions.reduction > 100)
      )
        return false;
      if (
        w.outcome &&
        (!["hours", "implementationCost", "monthlyCost"].every(
          (k) => Number.isFinite(w.outcome[k]) && w.outcome[k] >= 0,
        ) ||
          typeof w.outcome.period !== "string" ||
          typeof w.outcome.demo !== "boolean")
      )
        return false;
      return true;
    });
    if (valid.length !== parsed.length)
      return {
        workflows: valid,
        warning:
          "Some invalid saved records were skipped. Valid workflows were restored.",
      };
    return { workflows: valid };
  } catch {
    return {
      workflows: [],
      warning:
        "Saved data could not be read. You can start again or load the example agency.",
    };
  }
}
export function saveWorkflows(w: Workflow[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(w));
    return true;
  } catch {
    return false;
  }
}
