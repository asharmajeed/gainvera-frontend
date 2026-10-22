import type { Workflow } from "./models";
const base = {
  business: "Northstar Creative",
  hourlyCost: 30,
  analyzed: false,
  sample: true,
  painPoints: "",
  risk: "low" as const,
  data: "digital" as const,
};
export const exampleWorkflows: Workflow[] = [
  {
    ...base,
    id: "reporting",
    name: "Weekly client reporting",
    description:
      "Export campaign performance metrics from analytics spreadsheets and prepare weekly client reports with a written summary of trends.",
    hours: 3,
    frequency: 8,
    tools: "Google Analytics, Sheets, Slides",
    painPoints: "Manual copying and repeated narrative drafting",
    risk: "medium",
  },
  {
    ...base,
    id: "content",
    name: "Social media content repurposing",
    description:
      "Repurpose approved blog articles into social media posts, LinkedIn copy and Instagram captions with editorial review.",
    hours: 2,
    frequency: 12,
    tools: "Docs, Canva, social scheduler",
    risk: "medium",
  },
  {
    ...base,
    id: "meetings",
    name: "Internal meeting summaries",
    description:
      "Summarize internal team meeting notes into decisions and action items with owners and deadlines.",
    hours: 1,
    frequency: 12,
    tools: "Team notes, task tracker",
    risk: "medium",
  },
  {
    ...base,
    id: "files",
    name: "Repetitive file organization",
    description:
      "Sort campaign asset files into client folders and rename files with consistent naming rules. Check duplicate file versions.",
    hours: 0.5,
    frequency: 40,
    tools: "Shared drive",
    painPoints: "Inconsistent naming and folder placement",
  },
  {
    ...base,
    id: "approval",
    name: "Sensitive client budget approval",
    description:
      "Review confidential financial documents and approve client budget decisions and payments based on contract obligations.",
    hours: 1.5,
    frequency: 4,
    hourlyCost: 60,
    tools: "Accounting system, contracts",
    risk: "high",
  },
  {
    ...base,
    id: "routing",
    name: "Routine task routing",
    description:
      "Route validated digital request forms to the task tracker, assign tasks by service type and send status notifications using stable rules.",
    hours: 0.25,
    frequency: 80,
    tools: "Forms, project tracker",
  },
];
