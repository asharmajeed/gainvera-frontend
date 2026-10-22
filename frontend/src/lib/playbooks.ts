import type { Playbook } from "./models";
export const playbooks: Playbook[] = [
  {
    id: "reporting",
    name: "Client reporting",
    corpus:
      "client reporting weekly monthly reports campaign performance analytics metrics spreadsheet export dashboards summary insights Google Analytics advertising spend",
    category: "AI-ASSISTED",
    reduction: 50,
    setup: 5,
    toolsCost: 25,
    difficulty: 35,
    strategy: "Standardize the data. Accelerate the narrative.",
    why: "A repeatable report structure reduces preparation work; interpretation and factual accuracy still need an analyst.",
    tools: [
      "Existing analytics CSV exports",
      "Spreadsheet report template",
      "Optional approved AI drafting tool",
    ],
    steps: [
      "Export the same reporting period and metrics from each source into a standard spreadsheet.",
      "Create a locked report template with metric definitions and previous-period comparisons.",
      "Draft a short narrative using only the approved metric table; omit client identifiers.",
      "Have the account lead verify every number, explanation, and client-facing claim.",
      "Pilot two reporting cycles and record export, drafting, correction, and review time.",
    ],
    template:
      "Using only the supplied metric table, draft: 1) performance changes, 2) observations, 3) questions for the analyst. Cite each number to a table row. Do not invent causes, benchmarks, or missing metrics. Flag unavailable data.",
    review:
      "An analyst verifies all metrics and interpretations before a report reaches the client.",
    risks:
      "Inconsistent date ranges, invented explanations, and accidental disclosure of client data.",
    measure:
      "Compare preparation + correction + review hours for the same number of clients; record factual errors.",
  },
  {
    id: "content",
    name: "Content repurposing",
    corpus:
      "social media content repurposing posts blog article copy captions LinkedIn Instagram writing editorial brand tone creative draft",
    category: "AI-ASSISTED",
    reduction: 40,
    setup: 3,
    toolsCost: 20,
    difficulty: 25,
    strategy: "Turn approved source content into reviewed first drafts.",
    why: "Draft variation benefits from language assistance, while brand voice, originality, and accuracy remain editorial decisions.",
    tools: [
      "Approved source library",
      "Brand voice checklist",
      "Optional approved AI drafting tool",
    ],
    steps: [
      "Select one approved long-form article and document the target audiences.",
      "Create platform-specific length, tone, and formatting rules.",
      "Generate several draft variants from the source only.",
      "Have an editor check claims, rights, tone, and accessibility.",
      "Publish through the existing scheduler after approval and measure total editing time.",
    ],
    template:
      "Repurpose the approved article into three LinkedIn drafts and three Instagram captions. Preserve factual claims, use our brand guide, and mark statements that need verification. Do not publish or add statistics.",
    review: "Editor approval is required for every draft before scheduling.",
    risks:
      "Generic tone, unsupported claims, copyright issues, and repetitive output.",
    measure:
      "Track drafting + editing time per accepted post and editor acceptance rates.",
  },
  {
    id: "meetings",
    name: "Meeting summaries",
    corpus:
      "internal meeting summaries notes transcript minutes action items decisions team status discussion summarize",
    category: "AI-ASSISTED",
    reduction: 55,
    setup: 2,
    toolsCost: 15,
    difficulty: 20,
    strategy: "Draft action-oriented minutes from consented notes.",
    why: "Summarization is useful, but assigned owners and decisions can be misinterpreted.",
    tools: [
      "Consented notes or transcript",
      "Action-item template",
      "Existing task tracker",
    ],
    steps: [
      "Obtain participant consent and exclude sensitive discussions.",
      "Use a consistent notes format: decisions, owners, deadlines, unresolved items.",
      "Draft a summary from the notes and flag ambiguous statements.",
      "Ask the meeting owner to verify decisions and assignments.",
      "Copy approved action items into the tracker and record review time.",
    ],
    template:
      'Summarize these notes as Decisions / Actions / Open questions. For each action include owner and deadline only when explicitly stated; otherwise write "not specified". Do not infer agreement.',
    review: "The meeting owner confirms decisions and each action owner.",
    risks:
      "Recording without consent, incorrect attribution, and retention of confidential discussion.",
    measure:
      "Measure notes + review time per comparable meeting and count corrected action items.",
  },
  {
    id: "files",
    name: "File organization",
    corpus:
      "repetitive file organization folders naming rename sort files assets documents move duplicate directory organizing",
    category: "SIMPLIFY WITHOUT AI",
    reduction: 75,
    setup: 3,
    toolsCost: 0,
    difficulty: 15,
    strategy: "Use deterministic naming and folder rules.",
    why: "Explicit naming and routing rules solve this task more predictably than language generation.",
    tools: [
      "Built-in folder rules",
      "A small local script",
      "Shared naming convention",
    ],
    steps: [
      "Agree a client / campaign / date folder structure and naming convention.",
      "Back up files and define rules for duplicates and unknown names.",
      "Run a script in dry-run mode to preview every proposed move.",
      "Review the preview, then apply changes to a small test folder.",
      "Log changes, keep a rollback map, and measure exceptions and maintenance.",
    ],
    template:
      "File naming template: CLIENT_CAMPAIGN_YYYY-MM-DD_ASSET-VERSION.ext. Route unmatched files to a review folder. Never overwrite or delete duplicates automatically.",
    review:
      "A team member approves the dry-run and handles unmatched or duplicate files.",
    risks:
      "Incorrect moves, overwritten assets, broken links, and ambiguous file names.",
    measure:
      "Compare filing + exception-handling hours for the same asset volume; require zero lost files.",
  },
  {
    id: "approval",
    name: "Sensitive financial approval",
    corpus:
      "sensitive financial approval approve payment client budget investment decision legal contract bank transfer credit refund invoice confidential authorize financial judgment",
    category: "LEAVE ALONE",
    reduction: 0,
    setup: 0,
    toolsCost: 0,
    difficulty: 90,
    strategy: "Keep financial authority with an accountable human.",
    why: "Financial approval involves responsibility and context that a local text matcher cannot safely evaluate.",
    tools: [
      "Existing approval checklist",
      "Access-controlled financial system",
      "Dual approval for high-value transactions",
    ],
    steps: [
      "Document the authorized approver and approval limits.",
      "Separate document preparation from the approval decision.",
      "Verify amounts, payees, contracts, and source documents manually.",
      "Keep an auditable approval record and escalation path.",
      "Measure administrative burden without delegating authority to AI.",
    ],
    template:
      "Approval checklist: source document verified / payee verified / amount verified / budget checked / authorized reviewer signed / audit reference saved.",
    review:
      "An authorized human makes every decision. No automatic payment or approval.",
    risks:
      "Financial loss, privacy exposure, legal responsibility, and unauthorized decisions.",
    measure:
      "Track review quality, exceptions, and approval time; prioritize safety over estimated savings.",
  },
  {
    id: "routing",
    name: "Routine task routing",
    corpus:
      "repetitive status updates task tracker notify notification reminders schedule routing assign tasks rules copy fields form checklist CRM data entry",
    category: "AUTOMATE NOW",
    reduction: 65,
    setup: 4,
    toolsCost: 10,
    difficulty: 20,
    strategy: "Connect structured inputs to explicit routing rules.",
    why: "Frequent, structured transfers with stable rules can run automatically with an exception queue.",
    tools: [
      "Existing tracker automations",
      "Form validation",
      "Rule-based notification or import",
    ],
    steps: [
      "List required fields and specify trigger, destination, and routing rules.",
      "Confirm digital access and permissions; validate all required fields.",
      "Configure the existing tracker to route matching records.",
      "Test missing data, duplicates, and failures; send exceptions for review.",
      "Pilot with logging and a manual fallback, then compare operator hours.",
    ],
    template:
      "When a validated request arrives, route by service type. Reject missing required fields, deduplicate using request ID, log the action, and send ambiguous requests to a human.",
    review: "Review the test run and exception queue. Audit a weekly sample.",
    risks:
      "Duplicate actions, missing fields, incorrect routing, and unattended failures.",
    measure:
      "Track successful transfers, exception rate, operator time, and maintenance.",
  },
];
export const fallback: Playbook = {
  id: "unknown",
  name: "Unmatched workflow",
  corpus: "",
  category: "LEAVE ALONE",
  reduction: 0,
  setup: 0,
  toolsCost: 0,
  difficulty: 80,
  strategy: "Document the work before selecting an improvement.",
  why: "The description does not match a curated playbook strongly enough to support a recommendation.",
  tools: ["One-week time log", "Process checklist"],
  steps: [
    "Observe three representative occurrences and record steps and time.",
    "Identify inputs, output standards, exceptions, and decision owners.",
    "Confirm data access and sensitivity.",
    "Describe the recurring steps and run the analysis again.",
  ],
  template:
    "For each occurrence record: input / steps / minutes / exceptions / review / outcome.",
  review: "A process owner validates the baseline and any proposed change.",
  risks:
    "Insufficient evidence; a similarity score is not a validated prediction.",
  measure: "Establish comparable baseline volume, time, and quality.",
};
