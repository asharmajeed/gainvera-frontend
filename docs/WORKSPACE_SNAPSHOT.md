> Imported combined-workspace snapshot. Use the scoped root context
> and README for source present in this repository.

# Gainvera shared project context

Last updated: 2026-10-22 (Asia/Karachi; cross-member repository preparation)

Latest change: prepared separate source-only `github/gainvera-frontend/` and
`github/gainvera-backend/` copies, with backend and data kept together. Each has
scoped context/agent/setup documentation and placeholder-only environment files.
The original applications, private settings, installations and frozen C release
remain in place. No Git repository, remote, commit, upload or deployment is
created. Copy hashes, exclusions and 249 local links passed; all 46 C tests
passed from the copied backend using the original isolated ML interpreter.
Overwrite refusal also passed. See `docs/REPOSITORY_VERIFICATION.md` for limits;
earlier frontend/backend application evidence stays dated.

Read this at the start of a new chat. Keep it updated with the code. It describes
this working copy; read [AGENTS.md](../AGENTS.md) for the update rules and
[the change log](../docs/CHANGELOG.md) for recent work.

## 1. What the project does

Gainvera helps a business decide which repeated tasks are worth improving.
A workflow means a task the business does regularly, such as writing product
descriptions, answering support questions or preparing an order report.

The business describes a task, how long it takes, how often it happens, its labour
cost, available data and risk. Gainvera recommends an approach, explains why,
shows implementation guidance and estimates the time/value that might be gained.
Later, the user can enter results and compare them with the estimate.

The overall goal is better decisions about work, with explanations and measurable
results. Recommending automation does not mean Gainvera performs that automation.

## 2. MVP scope and constraints

The chosen MVP audience is **small e-commerce stores**. It is not tied to one real
store or a required Shopify/WooCommerce account. Marketing agencies were the
audience of the original demo; that working demo is the migration starting point.

The team has three members and limited time, using AI-assisted coding. The plan
uses synthetic classroom examples and reviewed guidance. It does not depend on
visiting/interviewing business owners. Synthetic task labels cannot prove real
business savings or industry-level accuracy.

The intended MVP flow is:

1. Sign in and create/select a store workspace.
2. Add a workflow with baseline time, frequency, hourly cost, risk and data facts.
3. Classify its task family with a trained scikit-learn classifier.
4. Apply fixed backend rules to choose the action category and priority.
5. Get guidance grounded in a reviewed playbook, with AI generation or an
   explicitly labelled fallback/clarification state as appropriate.
6. Adjust ROI assumptions and see deterministic calculations.
7. Enter self-reported monthly results and compare them with the saved baseline.
8. View a dashboard and export an audit/report.

This is the **target flow**, not the current integrated implementation. No live
store automation, refund approval, order changes, publishing or sending messages
is part of the current MVP scope. Estimated capacity value is not guaranteed cash.

## 3. Current implementation: what actually exists

| Area | Current state | Evidence / main paths |
| --- | --- | --- |
| Repository preparation | Two source-only upload snapshots; frontend separate from backend + data; originals retained, no automatic sync or GitHub upload | `github/`, `scripts/prepare_github_repos.py`, `docs/GITHUB_SETUP.md` |
| Frontend | Agency demo `/`, explicit fixture preview `/ecommerce`, real Auth and workspace/workflow storage `/ecommerce/account` | `frontend/src/components/gainvera.tsx`, `frontend/src/components/ecommerce/` |
| E-commerce preview | Workspace/workflow CRUD, six fictional inputs, baseline history, unconnected sign-in, simulated response gallery, local scenario math, split measurement entry, overview and escaped fixture HTML report; resets on leaving/reload | `frontend/src/lib/ecommerce/`, `frontend/src/components/ecommerce/`, `frontend/src/app/ecommerce/` |
| Frontend API foundation | Types/adapters, POST/PATCH whitelists, paging and bearer transport; account UI uses HTTP, fixture UI uses isolated local state | `frontend/src/lib/api/`, `frontend/src/lib/account/`, frontend tests |
| Agency demo features | Workflow CRUD, six sample workflows, local recommendations, ROI, results tracking, dashboard and HTML/print audit export | Existing agency components and libraries, unchanged by the results task |
| Frontend storage | Agency LocalStorage unchanged; fixture preview memory-only; SDK persists its Auth session separately, account records live in backend storage | `frontend/src/lib/persistence.ts`, `frontend/src/lib/ecommerce/preview.ts`, `frontend/src/lib/account/` |
| Current analysis | Agency only: local rules plus TF-IDF/cosine matching. E-commerce: static simulated reference states, no classifier, recommendation rules or live generation | `frontend/src/lib/analysis.ts`, `frontend/src/lib/ecommerce/response-examples.ts` |
| Backend foundation | Modular FastAPI app, typed settings, safe errors, request IDs, restricted logs and configurable CORS | `server/app/main.py`, `server/app/core/` |
| Implemented HTTP endpoints | Public health/docs; authenticated workspace/workflow CRUD, reviewed-playbook reads, GET workflow baselines and GET/POST measurements | `server/app/api/health.py`, `records.py` |
| Shared contracts | Executable draft Pydantic types and API/ML documents | `server/app/contracts/`, `docs/*-contract.md` |
| Supabase project setup | User created the hosted project; URL/publishable key saved locally; public Auth settings probe returned HTTP 200 | `server/app/check_supabase.py`, `docs/SUPABASE_SETUP.md`; ignored `server/.env` |
| Database / auth | Three migrations deployed; eight RLS-protected tables, measurement keyset index, one-owner workspaces, online getUser verification and request-scoped user JWT access | `server/supabase/`, `server/app/core/supabase.py`, `repository.py`, `api/dependencies.py` |
| Baseline history | Immutable snapshots; actual input edits increment version and require reanalysis; old measurements retain original baseline | `workflow_baselines`, SQL triggers and composite foreign keys |
| History / measurements | Bounded owner-scoped pages; POST accepts an explicit existing historical baseline; missing version 404, duplicate workflow/version/month 409 | `server/app/core/history.py`, `docs/api-contract.md` v1.2 |
| Backend ROI | Typed, validated, unrounded deterministic service; preserves negative outcomes/null payback; version mismatches rejected. No ROI HTTP route | `server/app/services/roi.py`, `docs/ROI_SERVICE.md` |
| Future business APIs | Analysis/scenario/ROI HTTP execution, priority rules, dashboard and report routes remain planned | `docs/api-contract.md` |
| E-commerce dataset | C supplied synthetic v1: 180 descriptions, 60 groups, fixed 108/36/36 splits; separate 30/30 challenge sets, hashes and checks; not human-reviewed | `data/README.md`, `data/workflows.csv`, `data/splits/` |
| Trained ML | C supplied frozen v1 pipeline, trusted loader, three-state predictor and evaluation; not API-integrated. 32/36 test recognition, 32/32 accepted correct; ambiguity detection weak | `server/app/ml/`, `docs/ml-evaluation.md`, `docs/MEMBER_C_ML_HANDOFF.md` |
| E-commerce playbooks / live AI | Six local AI-authored drafts supplied, one per family; no human review, reviewed version, import or AI integration | `data/playbooks.json`, `data/PLAYBOOK_REVIEW.md` |
| Frontend/backend integration | Real email/password sign-in, local sign-out, restoration/SDK renewal and workspace/workflow CRUD with paging/409 review/204 deletion; result services not bound | `frontend/src/components/ecommerce/account-workspace.tsx`, `frontend/src/lib/account/store.ts` |

`/health` reports process liveness only. Database/authentication are `not_checked`,
ML/AI are `not_implemented`; all have `checked=false`. A 200 proves no external
readiness. Analysis/scenario tables alone do not establish working HTTP endpoints.

Last recorded frontend checks: **21 October 2026**, 70 tests, lint, TypeScript
and production build passed, including `/ecommerce/account`. Production browser
checks on both allowed 3100 origins verified two real dedicated accounts, reload,
CRUD, workflow cursor paging, 409 draft reconciliation, sign-out and account
switching. Direct cross-owner API reads returned 404. Mobile 390×844 form validation
had no page overflow; agency's six existing records and fixture preview remained
accessible. Three disposable workflows were deleted; two empty QA workspaces
remain (no workspace-delete route). Expiry/renewal races and 401 failures use
injected tests; actual scheduled token expiry was not waited out. Node 22+ is now
required by the SDK. npm audit reports five high findings in the existing ESLint
dependency chain; no forced downgrade. See verification and A's handoff for limits.
Latest backend checks: **21 October 2026**, full Python suite 173 passed, zero
skipped (including real hosted tests); 20 embedded PostgreSQL migration/RLS tests
passed. Final focused ROI/history/example tests: 37 passed. Scoped Ruff
lint/format (37 files, excluding C's concurrent ML area) and dependency checks
passed. Pagination-index migration applied; DB advisors returned zero findings.
Standalone health/docs/OpenAPI returned 200. A real user created/paged baseline
history and saved/read a retrospective measurement: 201/200, duplicate 409,
missing token 401, original cost preserved; disposable data was cleaned up.
Backend was started on 127.0.0.1:8000 with app reload for A and left running at
verification time. Process state can change after the chat. No frontend tests
or C model tests were rerun by B; the frozen dataset validator passed unchanged.
Historical checks are not rerun by every agent. See [VERIFICATION.md](../VERIFICATION.md)
and server/VERIFICATION.md (gainvera-backend: `server/VERIFICATION.md`).

Member C data checks: **20 October 2026**, the release validator, 18 dataset tests
and Ruff lint/format passed. Checks cover exact hashes/membership, actual MLInput
compatibility, six labels, normalized duplicates, group leakage, challenge
annotations and explicit description-only projection. These are not model
metrics or human review; application/hosted suites were not rerun. See
data verification (gainvera-backend: `data/VERIFICATION.md`).

Member C draft checks: **21 October 2026**, six-draft validation, all 30 data
tests (12 playbook + 18 dataset) and Ruff lint/format passed. Checks include
shared enum/field parity, database-limit/source drift checks, rejected review
claims and read-only CLI behavior; none is human content approval or PostgreSQL
execution. Dataset hashes/membership remain unchanged. Application/hosted suites
were not rerun; see data verification (gainvera-backend: `data/VERIFICATION.md`).

Member C model checks: **21 October 2026**, dataset integrity passed before and
after training; all **46 C tests**, scoped Ruff lint/format and dependency checks
passed in `data/.venv-ml` (Python 3.12.14). Tests cover release reload/replay,
training-only reproduction, class order, all states, OOV, corrupt/missing files,
hashes and versions. Ordinary held-out forced accuracy/macro F1 are 1.0/1.0;
with abstentions as misses accuracy is 0.8889 and six-family macro F1 0.9364.
Four of six ambiguous challenges were accepted incorrectly. These are small,
correlated synthetic results, not real-world accuracy or human approval. Frozen
data/draft bytes and B's dependency manifests are unchanged; no application,
hosted or frontend suites were rerun by C. See [evaluation](../docs/ml-evaluation.md).

## 4. Team ownership and first next steps

| Member | Owns | Main locations | Next planned work |
| --- | --- | --- | --- |
| A | Frontend, e-commerce wording/forms, login UI, API adapter and result states | `frontend/` | Real Auth and workspace/workflow CRUD integrated and checked with two users. Next separately assigned task can bind B's v1.2 baseline/history and measurement APIs; analysis/scenario/dashboard/report still await B. See `docs/MEMBER_A_FRONTEND_HANDOFF.md`. |
| B | Backend, DB migrations, authentication, ownership, API, AI integration, risk rules, scores and ROI | `server/` except C's classifier area; shared contracts | Storage/auth, baseline/measurement APIs and ROI service are implemented. Next: trusted analysis/scenario writes, risk/priority rules, ML/AI integration and dashboard/report APIs. |
| C | Synthetic dataset, reviewed e-commerce playbooks, classifier training/inference, artifacts and evaluation | `data/`, `server/app/ml/`, `docs/ml-evaluation.md` | Dataset, six draft playbooks and frozen classifier/evaluation supplied. B needs the exact ML handoff for isolated integration. Genuine playbook review remains pending; ambiguity improvements require fresh held-out data and a new release. |

These are ownership defaults, not a claim that the next work has started.
C can work against the ML types now; A can prepare its adapter using clearly
labelled fixtures. B and C must align runtime dependency versions before model
integration. Contracts and shared dependency files affect more than one member.
Do only the task assigned in the current chat, even if the roadmap is longer.

## 5. Technology and folders

Target architecture:

- Next.js / React / TypeScript frontend, Node **22+**, local port **3100**.
- Python **3.12** / FastAPI backend, local port **8000**.
- Supabase hosted project with deployed PostgreSQL schema/RLS and verified Auth
  plus user-token-scoped persistence. No service key in normal API requests.
- scikit-learn 1.7.2 task-family classifier supplied by C; B API integration pending.
- OpenAI API for playbook-grounded guidance, planned; provider model not selected
  or configured in the foundation. Use current official docs when implementing.
- Deterministic backend ROI service implemented; risk/priority rules and ROI
  HTTP/scenario integration remain planned.

```text
Gainvera/
  AGENTS.md                 Agent working/update instructions
  PROJECT_CONTEXT.md        Current shared project snapshot (this file)
  README.md                 Setup, demo walkthrough and methodology
  VERIFICATION.md           Recorded application verification
  data/                     C's frozen data, draft playbooks, ML pins, training tools and tests
  frontend/                 Next.js app, package-lock.json and frontend tests
  server/                   FastAPI app, Python dependencies and backend tests
    supabase/               SQL migrations, local CLI config and database guide
    scripts/                Private-configuration migration runner
    tools/db-tests/         PostgreSQL SQL/RLS tests (PGlite)
  docs/api-contract.md       Implemented/planned API fields and legacy UI mappings
  docs/ROI_SERVICE.md        Typed ROI service usage and calculation semantics
  docs/MEMBER_A_BACKEND_HANDOFF.md
  docs/MEMBER_A_FRONTEND_HANDOFF.md
  docs/ml-integration-contract.md
  docs/ml-evaluation.md      Actual synthetic classifier evaluation and limitations
  docs/MEMBER_C_ML_HANDOFF.md Exact model loading, pins and B integration boundary
  docs/TEAM_WORKFLOW.md      Sharing instructions and new-chat prompts
  docs/SUPABASE_SETUP.md     Hosted project setup and connection check
  docs/CHANGELOG.md          Dated work and handoffs
  planning/                 Earlier MVP planning document and supporting files
  presentation/             Earlier classroom presentation and supporting files
  scripts/prepare_github_repos.py Source-only two-repository export/check helper
  scripts/repository_templates/   Scoped root docs for the prepared copies
  github/                   Ignored, independent upload snapshots; no Git initialized
    gainvera-frontend/      frontend/ plus supporting docs
    gainvera-backend/       server/ and data/ plus supporting docs
```

The original folders above remain the active combined workspace until the team
adopts the two copies. See [GitHub setup](../docs/GITHUB_SETUP.md) and
[actual layout checks](../docs/REPOSITORY_VERIFICATION.md). Backend owns the API
contract after adoption; the frontend copy is a reference snapshot. Add actual
companion repository URLs when known. Do not regenerate over active work.

`data/` contains C's synthetic release, six local draft playbooks and isolated ML
setup. `server/app/ml/` supplies the predictor and immutable versioned bundle;
`docs/ml-evaluation.md` records actual results. Reviewed content remains unsupplied.
Do not rename `frontend/` or `server/` without updating paths.
The source of installed frontend versions is `frontend/package-lock.json`;
`server/requirements.txt` is the pinned tested Python snapshot. Each app keeps
its own dependencies, environment example and ignore rules.

## 6. Shared names and interfaces

Task families are exactly:

| API ID | Task |
| --- | --- |
| `catalog_copy` | Draft product descriptions from confirmed facts |
| `support_reply` | Draft support replies using approved policies |
| `stock_alert` | Internal alerts using stable stock thresholds |
| `catalog_cleanup` | Clean catalog/spreadsheet data using rules |
| `order_report` | Prepare recurring order/sales reports |
| `refund_approval` | Human decisions about refunds/disputes |

Final action categories are exactly `AUTOMATE NOW`, `AI-ASSISTED`,
`SIMPLIFY WITHOUT AI`, `LEAVE ALONE`. A family is different from an action:
predicting `stock_alert` does not authorize automation.

API keys use snake_case. Risk accepts `unknown`, `low`, `medium`, `high`.
Data availability accepts `unknown`, `digital`, `manual`. Unknown is valid and
cannot be treated as confirmed low risk or digital readiness. Currency is USD,
time is decimal hours, confidence is 0–1 and priority is 0–100.

The API contract v1.2 defines implemented persistence/history/results and planned analysis
shapes. Business requests use `Authorization: Bearer <Supabase access_token>`;
the API verifies tokens online through Supabase getUser, then forwards the same
user JWT to the Data API. Missing/invalid/expired tokens fail 401; missing/foreign
records fail 404; stale PATCH fails 409; unavailable services fail 503. Keep
existing camelCase UI types behind an adapter; mappings remain in the contract.

The prepared adapter retains baseline/status, nullable analysis provenance and
split measurements in separate views. Legacy combined outcomes require explicit
re-entry. Fixture reads are labelled and never replace an HTTP failure. Backend
PATCH and keyset pagination are implemented in the prepared client. PATCH
includes expected `baseline_version` and editable fields
only; no nulls/empty edits. Lists return `items`/`next_cursor`, limit 1–100,
default 50. Workflow lists require `workspace_id`. The health type now includes
`not_checked`. Dashboard and scenario-result envelopes remain planned.

V1.2 adds `GET /workflows/{id}/baselines` returning a page of `WorkflowBaseline`
(`workflow_id`, `baseline_version`, full immutable Workflow `snapshot`,
`created_at`). It sorts by version with a scoped position cursor. Measurement
GET/POST routes use existing Measurement types; lists sort by creation time/UUID.
Both lists use the same page envelope and limits. POST deliberately accepts any
existing selected version of the owned workflow, including retrospective old
versions; it never silently substitutes current inputs. Join measurements to
original snapshots for comparisons. No measurement rewrite/delete endpoint.
See `docs/MEMBER_A_BACKEND_HANDOFF.md`; no frontend history/measurement binding
was added by B. ROI is a Python service, not an extra success-shaped HTTP route.

The e-commerce results UI uses existing record/input fields, with local-only
view models for scenarios and overview/report presentation. They are not shared
wire schemas. Reductions start blank; opted-in illustrative values are labelled.
Baseline edits hide stale scenarios while measurements retain original versions
and costs. State-gallery success examples never become saved workflow analysis.

C's classifier takes **description only**, including preprocessing in the saved
pipeline. It returns `recognized`, `abstained` or `unavailable`, with family,
confidence, reason and version fields as documented. Missing/incompatible artifacts
must remain unavailable; no fabricated prediction or confidence. The ML contract
defines artifact location, manifest, hashes, package versions and evaluation.

The existing local matcher also uses title/pain text; that legacy behavior is not
the new classifier's input contract or a calibrated ML confidence measure.

Dataset v1 uses `description` only as X and `task_family` only as y; IDs, situation
summaries, splits and provenance are metadata. Fit only on train; choose settings
on validation; freeze before final test use. Challenges stay out of fitting.
The dataset validator checks OOV against a reference word-token set; the supplied
word pipeline separately verified all twelve OOV challenges have zero features. See
data protocol (gainvera-backend: `data/README.md`) for fixed membership and labelling boundaries.

Draft playbooks use database field names with `review_status=draft`, null
`reviewed_by`/`reviewed_at` and no invented `created_at`. They are not valid
reviewed API responses and must not feed approved guidance/fallback. Their base
recommendations and difficulty are unvalidated author proposals, not B's final
rules/scores. The draft scale uses higher difficulty for harder implementation;
B must confirm any scoring interpretation before integration. Actual review and
version finalization are separate from local validation (gainvera-backend: `data/PLAYBOOK_REVIEW.md`).

## 7. Decisions the agents must preserve

- ML identifies task family; backend rules choose action, risk treatment, priority
  and ROI. The LLM provides grounded guidance, not invented savings or authority.
- Keep humans responsible for sensitive decisions, including refund approval.
  Unknown/unsupported tasks need clarification, not invented time reductions.
- Synthetic examples, illustrative assumptions and reported outcomes must be
  labelled. No model accuracy or real-world savings claim without actual evidence.
- AI failures must produce a documented unavailable state or a separately
  justified, labelled reviewed-playbook fallback. Never hide service failure as
  successful analysis or an empty database result.
- Persistence verifies user/workspace ownership in the API and RLS. Do not trust
  client owner IDs. Baseline changes invalidate analysis and preserve historical
  snapshots. Compare measurements only with their original snapshot, never the
  latest workflow values. Explicit workflow deletion cascades its history/results.
- No browser records are uploaded automatically during migration.
- Keep secrets out of frontend variables/documents/logs. Normal API settings are
  ignored `server/.env` (`SUPABASE_URL`, publishable key and app settings only).
  Admin migration DSN lives in separate ignored `.env.admin`; dedicated test
  emails/passwords in ignored `.env.integration`. Neither is loaded by the API.
  Frontend Supabase URL/publishable key are public app configuration; never expose
  DB credentials or a secret/service key. AI configuration is still future work.
- Ordinary users can read reviewed playbooks, not seed/edit them. No reviewed
  content is supplied yet. C provides actual review/provenance; administrator
  seeding stays separate. Analysis/scenario/history/audit writes are denied to
  ordinary users in this phase. Future trusted writes need a narrow checked path.

Implemented ROI service meanings to preserve:

```text
baseline_monthly_hours = hours_per_occurrence * occurrences_per_month
gross_hours_saved = baseline_monthly_hours * reduction_percent / 100
gross_capacity_value = gross_hours_saved * hourly_cost
recurring_cost = monthly_tool_fees + monthly_maintenance_hours * hourly_cost
net_monthly_value = gross_capacity_value - recurring_cost
initial_investment = setup_fees + setup_hours * hourly_cost
first_month_value = net_monthly_value - initial_investment
payback_months = initial_investment / net_monthly_value, only if net > 0
net_hours_released = gross_hours_saved - monthly_maintenance_hours
```

Preserve negative results and null payback for nonpositive net value. The reduction
is a scenario assumption that includes review/corrections, not a model prediction.
New measurement fields separate production/review, maintenance and tool costs to
avoid double counting; do not blindly convert legacy combined outcome fields.

The old demo's priority formula is 35% value + 30% feasibility + 15% readiness +
20% safety; leave-alone scores are zero. Details are in README and
`frontend/src/lib/analysis.ts`. This is an explainable heuristic, not a validated
business-success probability. Its backend implementation is still pending.

## 8. Run and check

From the project root in PowerShell, frontend terminal:

```powershell
Set-Location .\frontend
npm ci
npm run dev
```

Open `http://localhost:3100`. In a separate terminal, starting at the project root:

```powershell
Set-Location .\server
.\.venv\Scripts\python.exe -m app
```

For a new machine, follow server/README.md (gainvera-backend: `server/README.md`) to create the Python
3.12 venv and install requirements first. An existing venv on this workstation is
not a portable dependency bundle. Health: `http://127.0.0.1:8000/health`; Swagger:
`http://127.0.0.1:8000/docs`. Current Swagger HTML uses external JS/CSS assets.

Frontend checks, from `frontend/`:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Backend checks, from `server/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check app tests scripts
.\.venv\Scripts\python.exe -m ruff format --check app tests scripts
.\.venv\Scripts\python.exe -m pip check
```

For migrations, SQL regression tests and opt-in real two-user tests, see
server/README.md (gainvera-backend: `server/README.md`) and [Supabase setup](../docs/SUPABASE_SETUP.md).
PGlite tests execute SQL with explicit Auth fixtures; hosted tests use actual
Supabase Auth and Data API. Neither is a frontend browser walkthrough.

C's checks run from the root with
`.\data\.venv-ml\Scripts\python.exe data/tools/validate_dataset.py`,
`.\data\.venv-ml\Scripts\python.exe data/tools/validate_playbooks.py` and
`.\data\.venv-ml\Scripts\python.exe -m unittest discover -s data/tests -v`.
Create that isolated environment with C's pins; do not install ML packages into
B's active venv. Exact load/predict, lint/format and reproduction commands:
[C's ML handoff](../docs/MEMBER_C_ML_HANDOFF.md).

The restricted Codex sandbox previously stalled the thread-based HTTP test client
and blocked local socket checks; those checks passed with local execution
permission. Report real execution limits rather than skipping checks silently.

## 9. Remaining dependencies and coordination

- Team sharing: on 2026-10-22 the user requested separate frontend/backend
  repository preparation. Source-only copies are under `github/`; backend keeps
  C's data and ML. No Git initialization, hosting, branches or upload has occurred.
  Use the setup guide to create remotes and agree the switch before parallel
  work. Original and copied contexts/code do not synchronize automatically.
- Backend persistence verification is complete: migrations/RLS, two-user hosted
  Auth/storage tests and current standalone HTTP checks passed. If startup shows
  WinError 10048, identify the existing listener and stop the older Gainvera
  instance before launching another. See the backend README. No Supabase
  connector is required for this CLI/Data API integration.
- C: frozen data, six draft playbooks and the classifier pipeline/artifact,
  predictor and actual evaluation are supplied. Preserve this release: its final
  test set is now seen and must not drive threshold/model changes. A real reviewer
  must assess drafts before a later review-metadata/version task. No reviewed
  content, real-store performance or savings is established.
- B/C: keep the drafts out of approved AI guidance, reviewed fallback and imports.
  After genuine review, B/admin handles a separate trusted import; confirm the
  difficulty interpretation before any scoring integration. A needs no change now.
- B/C: follow `docs/MEMBER_C_ML_HANDOFF.md` in a separate integration environment;
  reconcile exact serialization pins, validate the allowlisted artifact, offload
  synchronous inference and preserve clarification/unavailable states. B's active
  environment and manifests were left unchanged. Weak ambiguity detection means
  family recognition cannot replace B's risk/clarification rules.
- B: implement grounded AI generation, risk/priority rules, trusted
  analysis/scenario persistence and scenario calls to the existing ROI service.
  Dashboard/report APIs remain planned; measurement/history endpoints now exist.
- A/B: expand the verified login/workspace/workflow integration to history,
  measurements and future analysis/scenario results, with end-to-end checks for
  each newly connected service.
- A: real email/password Auth and workspace/workflow persistence are complete for
  this assignment. Public names are in `frontend/.env.example`; actual public
  configuration is ignored `.env.local`. SDK owns session persistence/renewal,
  account/workspace generations suppress stale responses, and 401 requires sign-in.
  Agency and fixture records are never uploaded. Real local access uses 3100;
  3101 is fixture-only. Sign-up/recovery and real result UI are not included.
- A/B: v1.2 original-baseline and measurement shapes now exist; A can bind them
  in a separate results task. Keep explicit historical selection/duplicate-409
  semantics distinct from stale workflow edits. Finalize not-analyzed/analysis
  failure semantics, scenario PUT envelope and dashboard/report/export schemas.
  Preserve expected versions and invalidation when those services arrive.
  Exact inputs and first integration task: [frontend handoff](../docs/MEMBER_A_FRONTEND_HANDOFF.md).

Update this list and the status table when the relevant work actually lands.
Record individual task evidence in [docs/CHANGELOG.md](../docs/CHANGELOG.md).
