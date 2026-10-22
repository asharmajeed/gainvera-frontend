import type { ApiTaskFamily, WorkflowDraft } from "../api";

/** UI input topics selected by the author; never classifier output or training data. */
export const storeExamples: { family: ApiTaskFamily; draft: WorkflowDraft }[] = [
  {
    family: "catalog_copy",
    draft: {
      name: "Draft product descriptions",
      description: "Draft clothing descriptions from confirmed material, size and care facts. A person checks every claim before publishing.",
      hours: 0.25, frequency: 40, hourlyCost: 20,
      tools: "Product spreadsheet", painPoints: "Repeated drafting and factual checks",
      risk: "unknown", data: "unknown", sample: true,
    },
  },
  {
    family: "support_reply",
    draft: {
      name: "Prepare support reply drafts",
      description: "Draft replies to delivery and sizing questions using approved policies. A team member reviews and sends every reply.",
      hours: 0.125, frequency: 120, hourlyCost: 20,
      tools: "Shared inbox and store policies", painPoints: "Looking up the same policy details",
      risk: "medium", data: "digital", sample: true,
    },
  },
  {
    family: "stock_alert",
    draft: {
      name: "Check low-stock thresholds",
      description: "Compare an inventory export with stable stock thresholds and flag items for internal review. No orders are placed automatically.",
      hours: 0.15, frequency: 20, hourlyCost: 20,
      tools: "Inventory export", painPoints: "Daily manual threshold checks",
      risk: "low", data: "digital", sample: true,
    },
  },
  {
    family: "catalog_cleanup",
    draft: {
      name: "Clean the product spreadsheet",
      description: "Find duplicate SKUs and inconsistent category names in a catalog spreadsheet using agreed rules. Review changes before importing.",
      hours: 1, frequency: 4, hourlyCost: 20,
      tools: "Catalog spreadsheet", painPoints: "Inconsistent formatting and duplicate rows",
      risk: "medium", data: "digital", sample: true,
    },
  },
  {
    family: "order_report",
    draft: {
      name: "Prepare the weekly order report",
      description: "Summarize completed orders and sales from a verified export for a weekly internal report. Reconcile totals before sharing.",
      hours: 0.75, frequency: 4, hourlyCost: 20,
      tools: "Order export and spreadsheet", painPoints: "Repeated filtering and totals",
      risk: "unknown", data: "digital", sample: true,
    },
  },
  {
    family: "refund_approval",
    draft: {
      name: "Review refund requests",
      description: "Review refund and dispute requests against order facts and the store policy. A human makes and approves every financial decision.",
      hours: 0.25, frequency: 16, hourlyCost: 20,
      tools: "Order history and refund policy", painPoints: "Gathering evidence for human decisions",
      risk: "high", data: "digital", sample: true,
    },
  },
];
