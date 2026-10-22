# Gainvera task change log

Newest task first. Add one entry for each task that changes files or an agreed
project decision. Keep the context snapshot current separately. Do not rewrite
older results or report a previous test run as a new one.

## 2026-10-22 — Cross-member — separate frontend and backend/data repository copies

- Result: prepared `github/gainvera-frontend/` and `github/gainvera-backend/`
  as independent source-only copies. Backend retains sibling `server/`/`data/`,
  C's complete model bundle and exact data/runtime bytes. Original application
  source, private settings, dependencies and planning/presentation archives stay
  in place. No Git initialization, commit, remote, upload or deployment.
- Files: `scripts/prepare_github_repos.py`, scoped root-document templates,
  `docs/GITHUB_SETUP.md`, `docs/REPOSITORY_VERIFICATION.md`, stronger root ignore
  rules and both prepared copies. Updated README, team workflow, verification
  and project context. Copies have placeholder-only environments, reference/API
  ownership notices and companion-path labels in place of broken source links.
- Checks: 152 non-Markdown source-copy hashes, exclusions, 249 local links,
  code fences, scoped helper Ruff lint/format and configured-private-value scan
  passed. Dataset/draft validators and all 46 C tests passed from the copied
  backend using the original isolated ML interpreter. Existing-output refusal
  returned 1 and changed no copied bytes. The initial archive-link rebasing
  failure was corrected before the passing export. Exact results/limits are in
  `docs/REPOSITORY_VERIFICATION.md`. No frontend rebuild, full backend/hosted/SQL
  suite, dependency installation or shipped-release retraining is claimed.
- Handoff: user creates two GitHub remotes and reviews/pushes each copy. Agree
  the switch before further work: A uses frontend; B/C use backend/data. Backend
  owns the API contract, with an explicit version/commit handoff to A. Original
  and copied work do not synchronize; the helper refuses to overwrite exports.

## 2026-10-21 — Member C — reproducible classifier, trusted predictor and evaluation

- Result: trained `ecommerce-family-v1.0.0` using description-only normalization,
  TF-IDF and probabilistic logistic regression on 108 training rows. A recorded
  1,152-trial search used only validation rows/challenges. Candidate and policy
  were frozen before one final held-out evaluation; no test-driven tuning or
  dataset changes followed. All fitting includes only training text/labels.
- Files: new `server/app/ml/` runtime/training package, trusted release registry
  and five-file versioned artifact bundle; C-owned `data/ml-requirements.txt`,
  selection plan, training entry point and sixteen ML tests. Added
  `docs/ml-evaluation.md` and `docs/MEMBER_C_ML_HANDOFF.md`; updated C setup,
  verification, ML contract, root README and shared context. Pinned-Ruff import
  formatting changed in C's existing draft test; playbook content remains draft.
- Actual evaluation: ordinary held-out forced accuracy/macro F1 1.0/1.0 on
  36 rows in twelve groups. Predictor recognized 32/36 (88.89% coverage), all
  correctly, and abstained on four. With abstentions counted as misses, accuracy
  is 88.89% and six-family macro F1 0.9364. Challenge negatives: 14/18 abstained;
  **four of six ambiguous tasks were falsely accepted**. All six unsupported
  and six OOV cases abstained; all twelve high-risk/adversarial cases retained
  the correct family. No calibration, real-world accuracy or savings claimed.
- Checks: frozen dataset integrity passed before/after training; six-draft
  validation passed; **46 C tests passed, zero skips**. Tests cover serialization,
  real release replay, training-only rebuild, classes, all output states,
  confidence, zero features, missing/corrupt artifacts, hashes and incompatible
  versions. Scoped Ruff lint/format and pip check passed; documented public
  load/predict example ran. Nine changed Markdown documents passed 86 local-link
  and code-fence checks. B's dependency manifests and frozen data/draft hashes
  are unchanged. C did not run application/hosted/frontend/database suites.
- Limits resolved: inaccessible Python alias, sandbox temp/DNS installation
  failures, initial lint issues and an ad-hoc missing `app` import path; final
  commands use isolated Python 3.12.14 and explicit server imports. Only C's venv
  received ML packages. B's active environment, API routes, startup/health,
  frontend, auth and DB policies were not changed. A/B's concurrent status and
  work were reread and preserved. No draft import, review or AI enablement.
- Exact handoff: B reads `docs/MEMBER_C_ML_HANDOFF.md`, shares the entire package
  and `server/app/ml/artifacts/ecommerce-family-v1.0.0/`, reconciles exact pins in
  a separate integration environment and calls `WorkflowClassifier.predict(MLInput)`.
  Preserve unavailable/clarification states; B owns bounded async integration,
  risk, final recommendations, priority, ROI and AI. Real playbook review remains
  separate. This final set is now seen; future ambiguity work requires a new
  selection cycle and fresh held-out situations. A needs no direct change now.

## 2026-10-21 — Member A — Supabase Auth and real workspace/workflow storage

- Result: added `/ecommerce/account` with official Supabase email/password
  sign-in, local-session sign-out, restoration and SDK-managed renewal. Bound
  workspace/workflow CRUD, cursor pages, selected workspace, expected-version
  PATCH, explicit 409 draft reconciliation and confirmed empty 204 deletion.
  Account/workspace generations and cancellation suppress old-session responses,
  errors and writes; 401 clears data and requires sign-in without replay.
- Separation: `/` agency storage/calculations stay intact; `/ecommerce` remains
  explicit memory-only fixtures with a link to real accounts. No automatic upload,
  fixture fallback, classifier, recommendation rules or real result binding.
- Files: `frontend/src/lib/account/`, account page/component, shared e-commerce
  forms/styles/navigation, `frontend/tests/account.test.ts`, package/lock metadata
  and public-only `.env.example`. Added SDK 2.118.0, requiring Node 22+. Actual
  public configuration was copied privately to ignored `.env.local`; no secrets
  or dedicated account credentials were added to source. Setup/API status docs,
  A/B handoffs, project context, screenshots and verification updated. B/C's new
  v1.2/history/ROI/draft work was reread and preserved; no implementation edits.
- Checks: final lint, typecheck, 70 frontend tests (15 new) and production build
  passed. Real production-browser checks on both allowed 3100 origins verified
  two users, reload, storage, workflow pagination, edits, 409 reconciliation,
  delete cancel/confirm, sign-out/account switch and cross-tab state clearing.
  Direct cross-owner workflow/workspace reads returned 404. Mobile 390×844 form
  validation had no overflow. Port 3101 blocked credentials and real requests.
  Existing six agency records and fixture flow stayed accessible; final captured
  browser warnings/errors were empty. Three disposable workflows were removed.
  A focused race test verifies that delayed list pages cannot resurrect deleted
  workflows or discard newly created ones; successful writes invalidate old reads.
- Limits: actual scheduled token expiry was not waited out; renewal/401 and
  delayed-session races use injected Auth/fetch tests. Workspace pagination is
  unit-tested; live paging covered workflows. Two empty named QA workspaces remain
  because no workspace-delete route exists. Initial invalid test UUIDs and a
  test-double return annotation failed checks and were fixed. npm audit reports
  five high findings in the existing ESLint dependency chain, with no forced
  downgrade. A browser batch was initially blocked by approval-service quota;
  it ran after the user resumed. Backend suites and full result integration were
  not rerun/claimed. Other environment limits are in verification.
- Handoff: requested Auth/storage integration is complete. B's newly available
  v1.2 original-baseline/measurement routes are a next A task. B still supplies
  agreed analysis/scenario/ROI HTTP/dashboard/report contracts; C supplies model
  provenance and genuinely reviewed playbooks/failure states through B. Exact
  boundaries, configuration names and review steps: `docs/MEMBER_A_FRONTEND_HANDOFF.md`.

## 2026-10-21 — Member B — deterministic ROI and history/measurement APIs

- Result: typed ROI service with strict input models, version matching,
  unrounded calculations, negative results and null payback for nonpositive
  ongoing net value. Documented example gives $60/month, $40 initial, $20 first
  month and 3.5 net hours. No assumptions, model result or cash guarantee invented.
- API v1.2: added owner-scoped GET workflow baselines and GET/POST measurements.
  Bounded/scoped keyset pages expose immutable original Workflow snapshots;
  retrospective writes explicitly select old versions. Missing baseline 404,
  duplicate workflow/version/month 409, invalid/generated fields 422.
  Duplicate conflicts include a fixed explanation and safe `body.period` detail.
  Existing user-JWT access, RLS and workspace/workflow wire shapes preserved.
- Files: `server/app/services/`, `core/history.py`, pagination, domain contracts,
  records/main; ROI/history tests, provider double, HTTP/OpenAPI and documented
  example tests, expanded hosted tests. Added migration
  `20261021060707_measurements_history_pagination_index.sql` (index only),
  `docs/ROI_SERVICE.md`; updated API/A handoff, setup/READMEs, verification and
  project context. No frontend, C data/ML or dependency files were edited.
- Checks: full backend suite **173 passed**, zero skips, including real hosted
  A/B tests; all **20 PostgreSQL/PGlite tests passed** with every migration.
  Final focused ROI/history/example tests **37 passed**. Scoped Ruff lint/format
  passed (37 files; C ML area excluded), dependency check passed. Migration dry
  run/apply succeeded and official DB advisors returned zero findings. Actual
  port-8000 health/docs/OpenAPI returned 200; real-user history pages, original
  cost retention, retrospective POST 201, GET 200, duplicate 409 and missing-token
  401 passed; disposable records were cleaned. Frozen dataset validator passed.
  Final full rerun after duplicate-error clarification: 173 passed, no skips.
  Eleven Markdown files passed link/fence checks; configured-secret scan was clean.
- Handoff: A reads `docs/MEMBER_A_BACKEND_HANDOFF.md` and API v1.2 to add baseline
  snapshot/list bindings and real measurement reads/writes when ready. The ROI
  service has no HTTP route yet. API was left running with reload on 8000 for A.
  C needs no implementation change; its frozen data and drafts were preserved.
- Remaining: frontend integration verification belongs to A; B still needs
  analysis/scenario/risk/priority, ML/AI integration and dashboard/report APIs.
  No success-shaped stubs, draft-playbook import or store automation added.

## 2026-10-21 — Member C — six draft e-commerce playbooks and review packet

- Result: created one local draft per family with conditions, proposed base
  category/difficulty, inputs, ordered steps, template, human review, risks,
  measurement and honest AI-authored/internal-source provenance. All versions
  are `0.1.0-draft.1`, review status stays `draft`, review metadata stays null
  and database-generated `created_at` is omitted. Refund/dispute authority stays
  human; no sending, publishing, purchasing or live action is supplied.
- Files: `data/playbooks.json`, `data/PLAYBOOK_REVIEW.md`, local Pydantic validator
  and twelve regression tests. Updated data/root READMEs, data verification,
  project context, ML handoff status and database guide's local-draft status.
  Shared executable types, database migrations, application source/dependencies,
  dataset CSVs and frozen split manifest were not changed.
- Checks: local draft validator passed for six drafts / zero reviewed records.
  All thirty data tests passed, no failures/skips: twelve new playbook checks
  plus eighteen existing dataset checks, including unchanged release hashes.
  Ruff lint/format passed across all four C Python files. Tests cover shared
  enums/field names, declared DB limits and SQL-source drift, invalid arrays/
  numbers/JSON, false review claims and a read-only CLI with sanitized errors.
  Local-link/path and code-fence checks passed for eight Markdown documents
  and 66 local links. Packet counts confirmed six inputs and seven steps per
  draft, null review metadata and no retained temporary JSON records.
  Initial lint found two import-order issues; corrected. The first test run had
  one failure in the test's nullable-column regex, corrected before the passing
  run. These were local authoring-check defects, not database/API failures.
- Limits/handoff: no human/external review, store trial, PostgreSQL execution,
  hosted checks, database seed, AI usage or training. Application suites were not
  rerun. A named reviewer now uses the unchecked packet and records actual
  findings for exact versions; later metadata finalization/import is separate.
  B retains final categories/scores/ROI and must confirm interpretation of the
  unvalidated difficulty scale before scoring integration. A/B need no code
  changes now and must exclude these drafts from approved guidance/fallback.

## 2026-10-20 — Member C — synthetic dataset and frozen evaluation splits

- Result: supplied `synthetic-workflows-v1.0.0`, 180 descriptions in sixty
  situation groups, three paraphrases each; deterministic per-family 6/2/2
  group assignments give 108/36/36 rows. Separate validation/test challenge
  files contain thirty rows each, covering unsupported, ambiguous, reference
  zero-vocabulary, high-risk and adversarial cases. High risk retains family.
- Files: `data/workflows.csv`, `data/challenges/{validation,test}.csv`,
  `data/splits/synthetic-workflows-v1.0.0.json`, data README/verification,
  stdlib validator and regression tests; data ignore/line-ending rules.
  Updated root README, project context and ML contract status/handoff only.
  Existing executable contracts, frontend/backend application source and
  dependencies are unchanged. No playbooks, model, predictor or seed added.
- Checks: using existing Python 3.12.14 from the root, release validation passed;
  eighteen dataset tests passed with no failures/skips. All 240 descriptions
  obey actual MLInput; six labels match TaskFamily. Exact-byte manifest
  reproduction, hash/membership drift, duplicates, leakage, invalid metadata,
  challenge annotations and description-only feature projection were checked.
  Ruff lint/format passed after formatting initial line-length findings.
  PowerShell SHA-256 checks independently matched release hashes. Local paths,
  links and code fences passed in six Markdown documents (45 local links).
  Application, hosted and database suites were not rerun; their prior evidence
  stays dated.
- Limits/handoff: AI-authored synthetic data and annotations, not human-reviewed
  or independently blind; no accuracy, calibration or savings result. Reference
  token OOV checks do not establish future vectorizer behavior. C's next assigned
  work can prepare playbooks or train using train-only fitting, validation-only
  selection and frozen final tests. Preserve release hashes/IDs and pass only
  descriptions as X. A/B need no code change now; B/C align dependencies and
  integrate only after a separately supplied compatible model. Share data plus
  context together; this copy still has no Git repository.

## 2026-10-20 — Member A — finish independent e-commerce results preparation

- Result: added separate family/action/priority/confidence presentation, clearly
  simulated analysis/failure references, blank scenario assumptions with labelled
  contract arithmetic, split measurement entry/history, local overview and escaped
  offline fixture HTML reports. Negative ROI/null payback remain visible. Baseline
  edits hide stale scenarios; measurements retain original version/cost. No new
  recommendation rules, shared wire envelopes, classifier or real integration.
- Files: `frontend/src/components/ecommerce/` result components/shell/styles,
  `frontend/src/lib/ecommerce/{preview,results,response-examples,report}.ts`,
  `frontend/tests/ecommerce-results.test.ts` and three result screenshot artifacts.
  Updated root/frontend/API setup docs, context and verification; added exact
  dependencies in `docs/MEMBER_A_FRONTEND_HANDOFF.md`. No B/C implementation,
  legacy agency source/storage logic, dependency versions or API shapes changed.
- Checks: from `frontend/`, final lint, typecheck, all 55 tests and production
  build passed. Nine new tests cover ROI/measurement math, negative/zero cases,
  baseline history, validation/isolation, absent versus zero results, provenance,
  retry/conflict/error handling and report escaping. Browser checks on separate
  dev port 3101 covered desktop 1440×1000/mobile 390×844, simulated states/read
  retry, blank assumptions, negative ROI, invalid calendar month, original v1
  measurements after a v2 edit, overview and HTML download. Mobile had no page
  overflow and arrow-key tab navigation worked. Final console warnings/errors:
  none. A disposable agency workflow was analyzed, survived preview navigation
  and reload, then only that record was removed. Existing 3100 process preserved.
- Backend availability: public local health/OpenAPI succeeded; route inventory
  confirms workspace/workflow/playbook storage, no result routes. Unsigned
  workspace GET returned 401. Health dependencies are unchecked/unimplemented,
  not verified ready. Probes/build used local execution permission; no credentials
  were inspected. The HTML download observation returned slowly but succeeded.
- Limits/handoff: real frontend login, two-user isolation, cloud results and PDF
  printing were not tested; backend suites were not rerun. B must confirm public
  Auth/API configuration, supported sign-in/redirects/CORS, test users, verified
  result endpoints, unresolved envelopes and original-baseline/conflict behavior.
  C supplies classifier/provenance, genuine reviewed playbooks and explicit
  failure states through B. A stops independent work here; first resume task is
  real Auth plus existing workspace/workflow binding and two-session verification.

## 2026-10-20 — Member A — e-commerce workspace and workflow preview

- Result: added `/ecommerce` with explicit fictional fixture mode, workspace
  selection/creation, six e-commerce input topics, workflow CRUD/delete confirmation,
  validation, search/status filters, loading/empty/error states, baseline history
  and unconnected sign-in/session presentation without collecting credentials.
  Local edits reset on leaving/reload; the agency demo and its storage are preserved.
- Files: `frontend/src/components/ecommerce/`, `frontend/src/app/ecommerce/page.tsx`,
  `frontend/src/lib/ecommerce/`, API types/adapter/client/validation, new
  `frontend/tests/ecommerce-preview.test.ts`, agency shell navigation link and
  `docs/screenshots/`. Updated setup/API docs, project context and verification.
  `next dev` generated `frontend/AGENTS.md`; no dependency/backend files changed.
- Decisions/contracts: aligned the client with B's existing v1.1 PATCH/page/health
  contract; no new wire schema. Real Auth and database binding are not enabled.
  Baseline edits invalidate active results, preserve immutable local snapshots
  and keep historical measurements on their original costs/version. The examples
  are authored UI inputs, not a dataset, inference, reviewed guidance or savings.
- Checks: from `frontend/`, final lint, TypeScript, 46 tests (8 new plus prior 38)
  and production build passed. Initial lint found two internal-link errors; fixed
  with Next Link. Browser checks on a separate dev server at 127.0.0.1:3101 passed
  workspace creation/switching, empty states, decimal/zero/invalid inputs, edits,
  baseline history, delete cancel/confirm, filters and unconnected sign-in. Desktop
  1440×1000 and mobile 390×844 had no horizontal overflow; mobile editor inspected.
  Dialog Tab/Shift-Tab trapping and Escape worked; final browser warning/error
  log was empty. A disposable agency record survived a preview round trip and was
  removed afterward. Screenshot artifacts saved; doc/source checks recorded in
  verification. Sandbox socket probes were denied; local permission confirmed
  live health/OpenAPI and B's route inventory. The older 3100 server was preserved.
- Handoff: A can now integrate actual Supabase sessions and B's persistence routes
  using `docs/MEMBER_A_BACKEND_HANDOFF.md`, then verify two real browser users,
  paging, expiry/401 and stale PATCH/409. B supplies the remaining analysis/ROI/
  measurement services and A/B finalize planned result envelopes. C's reviewed
  playbooks/classifier remain separate; no C input was required for this fixture UI.
- Remaining: no real frontend login/cloud saves, classifier/AI, backend analysis,
  ROI/result submission or integrated auth/ownership checks are claimed. Backend
  Python/SQL/hosted suites were not rerun by A for this frontend task.

## 2026-10-20 — Member B — resolve port conflict and verify standalone API

- Result: diagnosed the user's WinError 10048. An older Gainvera API occupied
  port 8000 and exposed only `/health`. Verified its process identity, stopped
  it, and started the current backend successfully; frontend processes untouched.
- Checks: real HTTP health/docs/OpenAPI returned 200 with current dependency
  statuses and business routes. Missing-token workspace access returned 401;
  PATCH CORS preflight 200; real Supabase test-user workspace access 200 with
  the expected page shape. No credentials or records were printed. The current
  API was left running on 127.0.0.1:8000 at verification time.
- Files: `PROJECT_CONTEXT.md`, `server/README.md`, backend/root verification,
  and this log. Added WinError 10048 startup guidance. No application, A/C,
  configuration or dependency files changed; no test suite rerun was needed.
- Handoff: standalone startup verification is now complete. A can use the
  existing working-route handoff to connect login/storage. Analysis/ROI,
  measurements, ML/AI and frontend integration remain future stages.

## 2026-10-20 — Member B — owner-scoped hosted persistence

- Result: added verified Supabase bearer authentication and request-scoped user
  JWT database access; implemented workspace GET/POST, workflow GET/POST and
  GET/PATCH/DELETE by ID, plus reviewed-playbook reads. Missing/foreign records
  use 404; invalid values 422; stale edits 409; unavailable services 503.
- Database: deployed two CLI-created migrations for seven requested tables plus
  immutable `workflow_baselines`; explicit grants, inherited RLS, version/audit
  triggers, indexes, constraints and USD. Baseline edits preserve original
  snapshots and measurements. No guidance, users, dataset or model was seeded.
- Files: `server/app/api/{dependencies,records,health}.py`, core Supabase,
  repository, pagination and error modules, domain contracts/main; migrations,
  local CLI config, migration helper, Python/SQL tests, dependency metadata and
  configuration examples. Updated backend/root READMEs and verification,
  API contract v1.1, Supabase setup, ML handoff status/link only, new A/database
  handoffs and project context. Classifier contract and C's files are unchanged.
- Configuration: ignored `.env.admin` contains the manual migration DSN;
  `.env.integration` contains dedicated live test users. Neither is loaded by
  the API. No service key is used by ordinary requests. API .env example now
  describes the implemented auth/storage settings.
- Checks: full Python suite 138 passed / 1 skipped before live users existed;
  after user setup, hosted suite 2 passed / 137 deselected / zero skipped.
  Real A/B tests covered CRUD, guessed-ID isolation, cross-owner inserts,
  direct Data API RLS and preserved measurement baselines. SQL/PGlite 20 passed.
  Ruff lint/format (33 files) and dependency checks passed. Official DB advisors
  initially found two performance warnings; tested follow-up resolved them:
  final result zero findings. Final documented-example/helper checks: 12 passed
  after directing pytest temp files into the writable workspace; initial default
  temp setup was blocked. Eleven Markdown files passed link/fence checks; local
  source/docs scan found no configured secret values. Frontend checks were not
  rerun; A/C files preserved.
- Handoff: A reads `docs/MEMBER_A_BACKEND_HANDOFF.md` and API v1.1 to add Auth,
  pages/PATCH/health types and bind working storage. C reads the ML contract and
  `server/supabase/README.md` for genuinely reviewed playbook administration.
- Remaining: standalone process startup verification was blocked by automatic
  approval review's account usage limit, not by application test failure;
  health/docs passed through TestClient. Frontend integration, trusted analysis
  writes, backend rules/ROI, measurement HTTP routes, C artifacts and AI remain
  future stages. No live store automation was added.

## 2026-10-20 — Member B — Supabase project setup and connection probe

- Result: guided the user through hosted project creation; configured the URL
  and publishable key in ignored `server/.env`. Added typed optional settings
  and an explicit read-only public Auth settings probe. A live check returned
  `reachable`, HTTP 200. Database schema and application login remain pending.
- Files: `server/app/core/settings.py`, `server/app/check_supabase.py`,
  `server/.env.example`, backend test fixtures/settings/probe tests;
  `docs/SUPABASE_SETUP.md`, root/backend READMEs, context/log and backend verification.
- Decisions/contracts: setup supports hosted Supabase origins and publishable
  keys only; no privileged key is needed. Probe requests are bounded and reject
  redirects; credentials and response bodies are not printed. Public settings
  connectivity does not change the API health claims or implement auth/business
  routes. No API schema or dependency versions changed.
- Checks: from `server/`, final `python -m pytest -q` using the project venv:
  88 passed. Ruff lint and formatting checks passed (21 Python files); `pip check`
  found no broken requirements. The actual `python -m app.check_supabase` returned
  HTTP 200 against the configured hosted project. Frontend tests/build were not
  rerun; other members' frontend work was preserved. Local links and code fences
  passed checks in all six updated Markdown documents.
- Handoff: B next implements migrations, owner-based RLS, access-token verification
  and persistence APIs before A wires login/data. Teammates configure their own
  ignored environment files using the setup guide; no credentials are in this log.
- Remaining: no tables/policies were applied, no user session was verified, no
  cloud administration was performed and the Supabase connector is unconfirmed.

## 2026-10-20 — Member A — frontend API foundation

- Result: added isolated TypeScript API types, explicit field adapters, request
  validation/whitelists, a configurable bearer-token-supplier HTTP client and
  opt-in read-only development fixtures. The UI is not connected to this module;
  the agency demo and its browser storage remain intact.
- Files: `frontend/src/lib/api/` (types, validation, adapter, client, fixtures,
  exports and usage README), `frontend/tests/api-adapter.test.ts`,
  `frontend/tests/api-client.test.ts`; updated root/frontend READMEs,
  `docs/api-contract.md`, `PROJECT_CONTEXT.md` and `VERIFICATION.md`.
- Decisions/contracts: no shared wire schema changes. Read metadata, nullable
  provenance, baseline versions and split measurements remain distinct from
  legacy UI records. No automatic upload, outcome conversion, HTTP fallback,
  authentication implementation, inference or recommendation logic was added.
  Fixtures contain fictional inputs and a labelled unavailable-analysis example,
  with no scenarios or measurements; fixture HTTP metadata is null.
- Checks: from `frontend/`, `npm run lint`, `npm run typecheck`, `npm test`
  (38 passed: 22 new plus 16 existing) and `npm run build` passed. Initial sandbox
  build failed to canonicalize the project path with access denied; local execution
  permission resolved it and the final build passed. Python AST/source comparison
  matched fields for 11 domain types and all four shared enums. Local Markdown
  links/code fences checked; SHA-256 comparisons confirmed sampled demo source,
  old tests and both dependency manifests unchanged. HTTP tests use injected
  responses; backend tests and live API/browser checks were not rerun.
- Handoff: A can build fixture-backed e-commerce screens next. B supplies verified
  auth/ownership and actual business endpoints. A/B must finalize PATCH fields,
  list pagination/cursors, dashboard shape, not-analyzed response behavior and
  the proposed scenario PUT result before those bindings are added.
- Remaining/blockers: real frontend/API integration, auth, database, analysis,
  backend ROI and C's classifier/reviewed playbooks remain pending. Successful
  response domain types are compile-time contracts, not full runtime decoders.

## 2026-10-20 — Team documentation — shared agent context

- Result: created a shared project snapshot, repository agent instructions and
  a team workflow/new-chat prompt. Added links in the root README.
- Files: `AGENTS.md`, `PROJECT_CONTEXT.md`, `docs/TEAM_WORKFLOW.md`,
  `docs/CHANGELOG.md`, `README.md`.
- Decisions: agents read current context at task start and update it with each
  file-changing task; code and context are shared together. Separate computers
  and chats still need updated project files through Git or a master-copy process.
- Checks: inspected current source, routes, contracts, manifests and historical
  verification before writing. All local Markdown links in the five changed
  documents resolved; checked current source/manifest paths existed. Compared
  all six task families, four recommendations, four risk values and three data
  availability values with the Python contract: all were present. Confirmed
  planned data/playbook/predictor files were absent and code fences were balanced.
  Application tests/build were not rerun for this documentation-only task;
  prior results remain dated 2026-10-19.
- Handoff: all members read PROJECT_CONTEXT.md and use the prompt in TEAM_WORKFLOW.
  Shared Git setup remains pending; this folder is not a Git repository.
- Remaining implementation: e-commerce UI/API integration, persistence/auth,
  datasets/reviewed playbooks, trained ML, grounded AI and backend rules/ROI.

## Earlier work — pointers to existing evidence

- **2026-10-19, folder reorganization:** frontend moved to `frontend/`; setup and
  ignore rules corrected. Recorded checks: 16 frontend tests, lint, TypeScript,
  build and HTTP assets; 60 backend tests, Ruff and dependency checks.
  See [root verification](../VERIFICATION.md).
- **2026-10-19, Member B foundation:** FastAPI health/docs, settings, errors,
  request IDs, CORS/logging and executable draft API/ML types. Business routes,
  database, auth, ML and AI remained planned. See
  backend verification (gainvera-backend: `server/VERIFICATION.md`).
- **2026-10-08, original local demo:** working marketing-agency frontend and
  classroom walkthrough. See the dated original record in root verification.

## Entry template

Copy this format into a new dated entry above the existing tasks, then replace
the placeholders. Do not leave a claimed result or check as a placeholder.

```text
## YYYY-MM-DD — Member A/B/C (or team docs) — short task title

- Result: implemented/partial/documented, and concrete behavior.
- Files: important changed paths.
- Decisions/contracts: what changed, or none.
- Checks: commands, working directory and actual outcomes; state what was not run.
- Handoff: what another member needs, or none.
- Remaining/blockers: unfinished work/dependencies, or none.
```
