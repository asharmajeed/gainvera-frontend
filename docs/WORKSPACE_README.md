> Imported combined-workspace record. Use this repository's root
> README and PROJECT_CONTEXT for current scope and setup. Historical
> commands, configuration and process claims refer to the original copy.

# Gainvera

Smarter workflows. Proven results.

A working browser-persisted agency demo, a separate e-commerce fixture preview,
and real Supabase sign-in with account workspace/workflow storage at
`/ecommerce/account`. Analysis/results integration remains separate.

Separate GitHub upload copies are prepared at `github/gainvera-frontend/` and
`github/gainvera-backend/`. Backend and data stay together. The original project
remains in place; these are independent source-only snapshots with no private
configuration or installed dependencies. Follow [GitHub setup](../docs/GITHUB_SETUP.md)
and [layout verification](../docs/REPOSITORY_VERIFICATION.md) before adopting them.
No Git initialization, remote, upload or deployment is included.

## Start here: team members and AI agents

Read [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) for the goal, current implementation,
roles, decisions and remaining work. [AGENTS.md](../AGENTS.md) tells agents to read
and update that context. See [the team workflow and new-chat prompt](../docs/TEAM_WORKFLOW.md)
for how to share it, and [the change log](../docs/CHANGELOG.md) for recent handoffs.
Keep these files with the code and share updates together.

## Folder structure

```text
Gainvera/
  AGENTS.md       Agent instructions, including context maintenance
  PROJECT_CONTEXT.md Current project state and team context
  data/           Member C data, fixed splits, draft playbooks, ML pins/tools/tests
  frontend/       Next.js demo, package.json, source and frontend tests
  server/         FastAPI, Supabase migrations, Python environment and backend tests
  docs/           Shared API and ML contracts
  planning/       MVP planning documents
  presentation/   Classroom presentation files
  README.md       Project setup and overview
  VERIFICATION.md Verification history and folder-move checks
  scripts/        Repository preparation/check helper and scoped doc templates
  github/         Ignored frontend and backend+data repository snapshots
```

Run npm commands inside `frontend/` and Python commands inside `server/`.
Each app has its own dependencies, environment example and ignore rules.
The root ignore file also protects environment files throughout the project.
The planning and presentation files describe earlier project stages; use the
commands below and the backend README (gainvera-backend: `server/README.md`) for the current layout.

## Member C data, classifier and draft playbooks

Synthetic dataset v1 (gainvera-backend: `data/README.md`) supplies 180 workflow descriptions in sixty
situation groups, fixed 108/36/36 train/validation/test rows and separate 30/30
challenge sets. It is AI-authored and not human-reviewed. C has now supplied
`ecommerce-family-v1.0.0` under `server/app/ml/`, trained only on 108 training
descriptions with validation-only selection. Only `description` is a feature.
Use the [isolated Python 3.12 ML setup and exact load command](../docs/MEMBER_C_ML_HANDOFF.md)
before running these checks from the root:

```powershell
.\data\.venv-ml\Scripts\python.exe data/tools/validate_dataset.py
.\data\.venv-ml\Scripts\python.exe -m unittest discover -s data/tests -v
```

The [actual evaluation](../docs/ml-evaluation.md) reports 32/36 ordinary test cases
recognized, all correctly; four abstained. Four of six ambiguous challenges were
incorrectly accepted. These synthetic results do not establish real-store
accuracy, calibrated business confidence or savings. The model is not wired into
FastAPI. C's exact pins are in `data/ml-requirements.txt`; B's active environment
and dependency manifests were not changed. The dataset validator uses stdlib only.

Six playbook drafts (gainvera-backend: `data/playbooks.json`) and an unchecked review packet (gainvera-backend: `data/PLAYBOOK_REVIEW.md`)
are supplied separately. All remain `draft` with null review metadata; they are
not approved guidance or imported records. Validate them locally with:

```powershell
.\data\.venv-ml\Scripts\python.exe data/tools/validate_playbooks.py
```

This validator uses Pydantic; shared reviewed API types are unchanged. See
actual C checks and limits (gainvera-backend: `data/VERIFICATION.md`). Human review, approved
versions and API integration remain separate future tasks.

## Run the frontend

Requires Node.js **22+** and npm. In PowerShell:

```powershell
Set-Location 'D:\Netsol\Gainvera\frontend'
npm ci
npm run dev
```

Open [the demo](http://localhost:3100). This app uses Next.js App Router, React,
TypeScript, Tailwind CSS, Lucide and Recharts. The agency demo and fixture preview
run locally without configuration; account sign-in/storage require public
Supabase configuration, internet access and the running API. The app uses system
fonts and no remote visual assets. Port 3100 avoids the original port
3000 conflict on this machine. The separate [e-commerce preview](http://localhost:3100/ecommerce)
supports local workspace/workflow editing with six fictional examples, simulated
analysis states, labelled local scenario ROI, baseline-linked measurements and
fixture overview/HTML reports. Its edits reset when leaving or reloading. The
separate [account workspace](http://localhost:3100/ecommerce/account) connects
real sign-in and workspace/workflow CRUD. Its analysis/results remain unconnected.
See [frontend setup](../frontend/README.md)
and [A's dependency handoff](../docs/MEMBER_A_FRONTEND_HANDOFF.md) for review steps
and remaining B/C inputs. Port 3101 supports fixture review only; real account
requests use 3100 because of the backend CORS allowlist. To run the production
build from `frontend/`:

```powershell
npm run build
npm start
```

Frontend checks, also from `frontend/`:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Run the backend

In a second PowerShell terminal, after the one-time Python 3.12 environment setup
in server/README.md (gainvera-backend: `server/README.md`):

```powershell
Set-Location 'D:\Netsol\Gainvera\server'
.\.venv\Scripts\python.exe -m app
```

Open [health](http://127.0.0.1:8000/health) or
[API documentation](http://127.0.0.1:8000/docs). Authenticated workspace/workflow
storage, reviewed-playbook reads and baseline/measurement APIs are implemented.
Analysis, scenario/ROI, dashboard and report HTTP routes remain planned. Public
frontend configuration plus sign-in connect the account workspace; agency and
fixture screens stay local.

The hosted Supabase project has been created and its public Auth settings
connection was checked. Local settings and the read-only verification command
are explained in [Supabase setup](../docs/SUPABASE_SETUP.md). Tables and access rules
are deployed; frontend login and workspace/workflow persistence are integrated
at `/ecommerce/account`. History/measurement UI and other results remain separate.

## Classroom demonstration (2–3 minutes)

1. Open the Overview. Click **Load Example Agency**. Six workflows appear with illustrative inputs and no fabricated outcomes.
2. Click **Analyze Workflows**. Explain that the engine chooses among all four approaches, including conventional file rules and leaving financial approval with humans.
3. Click **View Recommendation** for **Weekly client reporting**. Show the implementation steps, factual review requirement, and copyable prompt.
4. Open **Why this score?** to show the formula and text-similarity evidence. This is local rules and TF-IDF matching, not trained predictive ML.
5. Open **ROI calculator**. Move the reduction slider from 50% to 65%. Values and dashboard rankings update immediately. Explain that the percentage is a scenario assumption and monetary capacity is not cash automatically saved.
6. Open **Track results**. Enter a hypothetical monthly measurement: 10 hours after, $150 implementation, $40 monthly costs, October 2026. Keep **This is hypothetical demo data** checked, then click **Save measurement**. Show the estimate versus the self-reported result.
7. Close the dialog, open **Results tracker**, and show the comparison. Click **Export Audit Report** to review the audit. Choose **Print / Save PDF** to print or save a PDF, or **Download HTML** for a portable offline report. Reports include assumptions, implementation plans, and measurement provenance.
8. Optional: show the **Workflows** view to add, edit, or delete a workflow. **Reset Demo** clears this browser’s data after an in-app confirmation.

## Agency demo methodology

The curated library covers reporting, content, meetings, file organization, sensitive approval, and routine task routing. A smoothed TF-IDF/cosine matcher compares descriptions with playbook vocabulary. A 0.16 similarity threshold selects a relevant playbook; unknown tasks receive an evidence-gathering plan and no assumed savings. Scores are explainable heuristic priorities, not validated predictions or probabilities.

Risk rules override text retrieval. Sensitive financial approval and declared high-risk tasks keep human authority. Work below two hours per month receives a leave-alone recommendation. Full automation requires user-confirmed digital inputs and low risk. Unconfirmed inputs receive conservative readiness/safety values; missing information is never confirmed evidence.

Score = 35% value + 30% feasibility + 15% data readiness + 20% safety, rounded to an integer. Leave-alone workflows score 0. Value = net monthly scenario value / $500 × 100, clamped to 0–100. Feasibility = 65% playbook ease + 35% frequency-based repetition. Repetition = monthly frequency × 8, capped at 100. Readiness is 100 for confirmed digital input, 35 for manual, 20 for unknown. Safety is 100 for low risk, 55 for medium, 0 for high, 30 for unknown. Curated difficulty is a heuristic, visible in the recommendation. Rank ties preserve inventory order.

Baseline = hours/occurrence × monthly frequency. Gross hours saved = baseline × reduction/100. Gross capacity value = hours saved × hourly cost. Ongoing net value deducts subscriptions and maintenance hours valued at hourly cost. Initial investment includes setup fees and setup hours. Payback exists only for positive ongoing net value. Capacity after upkeep deducts maintenance hours. Estimates include human review in the reduction assumption. Measured after-hours must include review and corrections; measured monthly cost must include maintenance. The app reports negative outcomes rather than hiding them.

## Agency demo implemented and future scope

Implemented: validated workflow CRUD, one-click sample loading, meaningful four-way local analysis, task-specific plans, live ROI adjustments, ranked/filterable dashboard and charts, outcome comparisons, LocalStorage persistence, responsive UI, empty/error/loading states, and printable/downloadable audit export. Records persist only in the current browser profile. Browser storage errors are displayed. Editing baseline inputs clears that workflow’s old analysis and measurements to avoid invalid comparisons.

Not implemented: optional server-side LLM integration, live third-party automations, independent verification, trained predictive ML, cloud sync, and shared accounts. The `frontend/.env.example` deliberately enables no API integration. Suggested tools are curated approaches, not live integrations or current pricing recommendations. All sample prices and reductions are illustrative.

## Source organization

- `frontend/src/lib/models.ts`: records and types
- `frontend/src/components/ecommerce/`, `frontend/src/lib/ecommerce/`: separate
  fixture workspace/workflow preview, inputs, local editing and baseline history
- `frontend/src/lib/api/`: separate e-commerce API types, adapters, HTTP client
  and explicit development fixtures; [usage and pending handoff](../frontend/src/lib/api/README.md)
- `frontend/src/lib/playbooks.ts`: curated implementation guidance
- `frontend/src/lib/similarity.ts`: TF-IDF matching
- `frontend/src/lib/analysis.ts`: classification, scores, and validation
- `frontend/src/lib/roi.ts`: deterministic ROI and outcome calculations
- `frontend/src/lib/fixtures.ts`: six sample workflows
- `frontend/src/lib/persistence.ts`: validated browser persistence
- `frontend/src/components/`: intake, recommendation, outcome, charts, print report, and application shell
- `frontend/tests/engine.test.ts`: focused calculation and classification tests

## E-commerce backend

Member B's FastAPI backend is in `server/`. It provides verified Supabase bearer
tokens, owner-scoped workspace/workflow CRUD, reviewed-playbook reads, deployed
RLS migrations and immutable baseline history, alongside health/docs and safe
errors. Baseline-history and measurement routes now work, with a typed ROI Python
service and three deployed migrations. Real two-user Auth/Data API tests passed.
Member A connects login/data screens separately. C's standalone classifier is
supplied; ML/AI integration, backend analysis/scenario,
ROI HTTP execution, dashboard and report APIs remain planned. The earlier
methodology/scope above describes the local demo.

See backend setup and tests (gainvera-backend: `server/README.md`), [A's working-route handoff](../docs/MEMBER_A_BACKEND_HANDOFF.md),
[API contract](../docs/api-contract.md) and [C's ML contract](../docs/ml-integration-contract.md).
