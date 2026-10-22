export const categories = [
  "AUTOMATE NOW",
  "AI-ASSISTED",
  "SIMPLIFY WITHOUT AI",
  "LEAVE ALONE",
] as const;
export type Category = (typeof categories)[number];
export type Risk = "unknown" | "low" | "medium" | "high";
export interface Assumptions {
  reduction: number;
  setupHours: number;
  setupCost: number;
  monthlyTools: number;
  maintenanceHours: number;
}
export interface Outcome {
  hours: number;
  implementationCost: number;
  monthlyCost: number;
  period: string;
  demo: boolean;
}
export interface Workflow {
  id: string;
  business: string;
  name: string;
  description: string;
  hours: number;
  frequency: number;
  hourlyCost: number;
  tools: string;
  painPoints: string;
  risk: Risk;
  data: "unknown" | "digital" | "manual";
  analyzed: boolean;
  assumptions?: Assumptions;
  outcome?: Outcome;
  sample: boolean;
}
export interface Playbook {
  id: string;
  name: string;
  corpus: string;
  category: Category;
  reduction: number;
  setup: number;
  toolsCost: number;
  difficulty: number;
  strategy: string;
  why: string;
  tools: string[];
  steps: string[];
  template: string;
  review: string;
  risks: string;
  measure: string;
}
export interface Analysis {
  category: Category;
  taskCategory: string;
  score: number;
  similarity: number;
  matched: boolean;
  playbook: Playbook;
  risk: Risk;
  repetitiveness: number;
  feasibility: number;
  evidence: number;
  value: number;
  safety: number;
  explanation: string;
  defaultAssumptions: Assumptions;
}
