> Imported combined-workspace record. Use this repository's root
> README and PROJECT_CONTEXT for current scope and setup. Historical
> commands, configuration and process claims refer to the original copy.

# Verification

## Repository copy preparation — 22 October 2026 (Asia/Karachi)

Separate frontend and backend+data source-only copies were prepared without
moving the original applications, environments or frozen releases. Actual
layout/hash/link checks and relocated-data validation are recorded in
[repository verification](docs/REPOSITORY_VERIFICATION.md). No frontend build,
full backend/hosted/SQL suite or model retraining is claimed for this task.
The older results below remain dated evidence from the original working copy.

## Member A Auth and account storage — 21 October 2026 (Asia/Karachi)

- Final commands from `frontend/`: `npm run lint`, `npm run typecheck`, `npm test`
  (**70 passed**, zero failures/skips) and `npm run build` passed. Production build
  generated `/`, `/_not-found`, `/ecommerce` and `/ecommerce/account`; `npm start`
  served the final build on 3100. SDK 2.118.0 installed from npm; Node 24.20.0 used,
  supported minimum now 22. Shared API wire shapes were not changed.
- Fifteen new injected tests cover public configuration/key rejection, safe
  sign-in/sign-out errors, session restoration versus auth events, fresh tokens
  on SDK renewal events, immediate sign-out clearing, late responses/errors/writes
  after account switches, current 401/correlation handling, workspace changes,
  page/cursor isolation, versioned PATCH, 409/no replay and strict 204 deletion.
  The final race test also covers old list pages completing after creation/deletion;
  their captured records cannot discard a new workflow or resurrect a deleted one.
  The previous 55 adapter/client/fixture/agency tests passed in the same run.
- Live production UI used dedicated private accounts on localhost:3100 and
  127.0.0.1:3100, whose browser sessions are separate. Both signed in, created a
  workspace/workflow, restored sessions after reload, retrieved/edited saved data,
  confirmed deletion and signed out. Same-origin switching A→B showed only B's
  workspace; SDK sign-out cleared another same-origin tab. The opposite owner
  workspace/workflows were absent from each list. Additional **non-browser**
  authenticated probes of B→A's workflow and workspace list returned 404.
- Real two-tab stale edit: A1 baseline v1 was open while another tab changed
  hourly cost to 25, producing v2. The first save received 409, kept its 0.5-hour
  draft, fetched v2 and disabled saving. After explicit review and preserving cost
  25, the user action saved v3 with `needs_reanalysis`. No automatic write replay.
  Deletion cancel preserved the record; confirmed deletion removed it only after
  successful transport. Page size 1 retrieved A1 then A2 through the live cursor.
  Workspace cursor behavior is covered by injected tests, not multiple live pages.
- Desktop default viewport and mobile 390×844 were inspected. Mobile sign-in
  document width/scroll width matched (375/375); mobile workflow dialog matched
  390/390 and empty-name validation focused the error. No horizontal overflow.
  Temporary viewport overrides were reset. Initial hidden-tab viewport attempts
  did not resize the target; final mobile checks used the selected review tab.
  Port 3101 displayed the allowlist limitation and zero credential fields.
- Agency localhost:3100 still showed its six existing Northstar Creative records
  after account sign-outs. Source hashes are unchanged; no legacy outcome was
  converted. The separate 3101 fixture preview still opened workflow/scenario
  views with blank assumptions and no cloud success. Existing dev 3101 and backend
  processes were preserved; only this task's own 3100 production process was
  stopped/restarted for its final build. Final captured browser warnings/errors:
  none. Screenshots: [storage](docs/screenshots/account-storage-desktop.jpg),
  [409 review](docs/screenshots/account-conflict.jpg),
  [mobile validation](docs/screenshots/account-storage-mobile.jpg).
- Cleanup: A1/A2/B1 disposable workflows deleted and both browser origins signed
  out. Empty `Frontend QA A 2026-10-21` and `Frontend QA B 2026-10-21` workspaces
  remain; there is no workspace DELETE API. Other members' records were preserved.
- Limits/resolved failures: first test run used invalid mock UUIDs (2 failures);
  fixed to contract-valid UUIDs. A later typecheck found an overly narrow mock
  return annotation; corrected, then typecheck/build passed. The Python Windows
  alias could not start; the existing server venv supplied the private setup/probe.
  npm audit initially failed sandbox DNS; the permitted retry returned five high
  findings in the ESLint→fast-glob→micromatch→braces chain, no Supabase runtime
  finding. No forced downgrade applied. Existing esbuild/unrs install scripts
  remained policy-blocked; checks still passed. An offline lock-metadata command
  failed on an uncached optional package; only root Node engine metadata was then
  updated directly, preserving dependency entries. Local install/build/probes
  used execution permission for path/network restrictions.
- A browser batch initially failed automatic approval review due to account usage
  limits; no action in that batch ran. After the user said continue, the approved
  retry completed. One sign-out wait timed out; inspection confirmed the current
  screen, a fresh click completed sign-out and subsequent reload/cross-tab checks
  passed. This is not an unresolved authentication failure.
- Actual scheduled access-token expiry/renewal was not waited out. SDK automatic
  refresh is configured; renewal events/401 handling are injected-test coverage,
  not a live-expiry claim. No recovery/signup, full analysis/results integration,
  production deployment, screen-reader audit or backend/SQL suite was tested by A.
  B's v1.2 baseline/measurement routes were confirmed in current OpenAPI but are
  not connected to the account UI. No model/review/performance claim was added.
  See [A's current handoff](docs/MEMBER_A_FRONTEND_HANDOFF.md).
- Final source/document checks resolved 75 local links and balanced fences in
  ten documents. Five legacy agency/model/storage/calculation hashes matched the
  task-start values. Four account boundary files contain no console logging,
  direct token-storage writes, agency engine/storage imports or fixture-source
  imports. Public local configuration has exactly the three documented names;
  private test passwords were absent from 56 source/document files. Package and
  lockfile SDK/Node-engine metadata match; all three screenshot artifacts exist.
- After the final pagination-race build, real sign-in and retrieval of the empty
  QA workspace passed again, followed by sign-out. A disposable local fixture
  workflow was created/deleted through the shared form; it never reached the
  account API. Private browser-test variables were cleared and the review screen
  was left signed out. No new browser warnings/errors were captured.

## Member B ROI and measurement/history — 21 October 2026 (Asia/Karachi)

Added the typed deterministic ROI service and owner-scoped baseline GET and
measurement GET/POST routes, preserving existing storage/auth/RLS. Full backend
suite: **173 passed**, no skips, including real two-user hosted checks. Final
focused ROI/history/example tests: **37 passed**. All **20 PostgreSQL/PGlite
tests passed** with the new index migration, which was applied to Supabase.
Official DB advisors: zero findings. Scoped Ruff lint/format and dependency
checks passed. The frozen dataset validator passed unchanged; frontend and C
model test suites were not rerun, and their implementation files were not edited.

Real standalone HTTP checks passed for health/docs/OpenAPI and new routes:
retrospective save 201, list/history 200, duplicate 409 and missing token 401.
Original baseline hourly cost remained unchanged after editing current inputs.
Disposable workspaces were cleaned up. The API was left running on 8000 with
development reload. See backend verification (gainvera-backend: `server/VERIFICATION.md`) for exact
commands, mocked-versus-live boundaries and handoff. ROI HTTP execution,
analysis/scenario/priority, AI/ML integration and dashboard/report APIs remain
future work; no frontend binding is claimed by these backend checks.

## Member A results preparation — 20 October 2026 (Asia/Karachi)

- From `frontend/`, final `npm run lint`, `npm run typecheck`, `npm test`
  (**55 passed**, zero failures/skips) and `npm run build` passed. The build
  generated `/`, `/_not-found` and `/ecommerce`. Checks were repeated after the
  last field-path/retry-hint changes; no outstanding lint/type/build failure.
- Nine new tests cover exact contract scenario/measurement arithmetic, negative
  net hours/value and null payback, retained historical baseline costs/scenarios,
  invalid months/versions and workspace boundaries, absent-versus-zero dashboard
  values, static simulated provenance, safe error/retry/conflict presentation and
  escaped reports. Existing 46 API/preview/agency tests also passed in this task.
  HTTP tests still use injected fetch, not signed-in backend calls.
- Browser checks used the existing separate Next dev server on 127.0.0.1:3101;
  the older 3100 process and exact-origin user storage were preserved. Desktop
  1440×1000 and mobile 390×844 inspected. The scenario dialog had mobile client
  width and scroll width both 390, with stacked fields and internal tab scrolling;
  no page overflow. ArrowRight selected the next result tab; Escape closed the
  dialog. Viewport override reset at the end. This is not a production-server
  browser walkthrough, automated accessibility audit or screen-reader test.
- Browser actions checked current not-analyzed/reanalysis and simulated live-AI,
  reviewed-fallback, abstained, classifier unavailable, loading, network and 409
  views. Family/action/priority/confidence and nullable provenance were separate.
  Simulated read retry remained unavailable with no network/write. Scenario
  assumptions initially blank; opted-in illustrative data edited to $500 tool
  fees showed -$430 monthly value, -$470 first-month value and no positive payback.
- Blank measurement submit produced validation; `2026-13` was rejected. A
  hypothetical `2026-10` entry with 6 production/review hours, 0.5 maintenance,
  $10 tools and $40 inclusive setup was saved only locally. After hours changed
  from 0.25 to 0.5 × 40/month, the workflow needed reanalysis and current scenario
  coverage fell to zero. That measurement still compared v1's 10 hours at $20/hour,
  with 3.5 net hours/$60 monthly value and the matching v1 scenario hours.
- Overview showed separate month/version/provenance without aggregate measured
  savings. HTML report downloaded successfully to the browser's Downloads folder;
  its content was inspected for fixture labels, v1 historical measurement and v2
  current input. Download observation took unusually long but returned a real
  file path; no fallback success was fabricated. Browser Print / Save PDF was not
  invoked. Generated report escaping is also covered by the focused test.
- Agency `/` initially had no records on this separate origin. One disposable
  fictional record was added and analyzed, survived navigation into the preview
  and back plus reload, then only that QA record was deleted. Final captured
  browser warning/error log was empty. Original server/storage origin untouched;
  legacy combined measurements were not converted or uploaded.
- Fresh real public backend probes returned health OK, OpenAPI storage routes
  (`/workspaces`, `/workflows`, `/workflows/{id}`, `/playbooks`) and 401 for
  unsigned workspace access. Analysis/scenario/measurement/dashboard/report HTTP
  routes are absent. Health database/auth `not_checked`, ML/AI `not_implemented`,
  all `checked=false`. Local probes/build used execution permission because of
  the known restricted path/socket environment. No secrets were read, real login
  attempted or backend/Python/SQL/hosted suite rerun. No live frontend integration
  or C artifact/playbook review is established by these checks.
- Screenshots: [baseline reanalysis](docs/screenshots/ecommerce-results-desktop.jpg),
  [overview](docs/screenshots/ecommerce-results-overview.jpg),
  [mobile scenario](docs/screenshots/ecommerce-results-mobile.jpg).
  Final source/document checks resolved 52 local links and balanced fences in
  nine documents. Eight SHA-256 comparisons matched the task-start legacy
  models, persistence, analysis, ROI, fixtures, agency component and dependency
  manifests. Eleven e-commerce source files have no browser-storage access or
  legacy analysis/ROI imports; all three new screenshot artifacts exist.
  Detailed next inputs: [A's handoff](docs/MEMBER_A_FRONTEND_HANDOFF.md).

## Member A e-commerce preview — 20 October 2026 (Asia/Karachi)

- From `frontend/`, final `npm run lint`, `npm run typecheck`, `npm test`
  (46 passed, zero failures) and `npm run build` passed. The build statically
  generated `/`, `/_not-found` and `/ecommerce`. Initial lint found two root-page
  anchor-link errors; using Next Link resolved them. Build/local server ran with
  local execution permission because of known sandbox path/socket restrictions.
- Eight new tests cover the six authored fixture topics, workspace isolation,
  decimal/zero facts and unknown defaults, no-op/stale edits, immutable baseline
  snapshots, historical measurement lookup and active analysis/scenario invalidation,
  child cleanup on deletion, v1.1 PATCH validation and encoded page/cursor requests.
  The prior 38 tests also passed. Network tests use injected fetch responses.
- Live public health/OpenAPI responded at 127.0.0.1:8000 and showed B's health,
  workspace/workflow and playbook routes. The first socket-restricted probes failed
  with access-permission errors; retrying with local permission succeeded. Health
  still reports dependencies unchecked and proves only liveness. No Supabase
  credentials were read or real signed-in data requested in this task.
- The existing server on 3100 served an older build and returned 404 for the new
  route. It was left alone. UI checks used a separate Next dev process on
  127.0.0.1:3101. The first navigation waited for compilation; the subsequent
  accessibility tree confirmed the new page. This is dev UI verification, not
  a production-server browser walkthrough.
- Desktop 1440×1000 and mobile 390×844 were inspected. The desktop document width
  was 1425; mobile document width was 375 (390 with the editor open), so no
  horizontal overflow was observed. Mobile editor fields stack and scroll within
  the dialog. See [desktop](docs/screenshots/ecommerce-desktop.jpg),
  [mobile](docs/screenshots/ecommerce-mobile.jpg) and
  [mobile editor](docs/screenshots/ecommerce-mobile-form.jpg).
- Browser actions verified workspace name validation, creation, switching and
  empty state; workflow validation, creation with 0.125 hours/0.5 occurrences/zero
  cost, editing to v2 with reanalysis status, retained v1 history, delete cancel
  and confirm, search-empty/clear and authored human-approval refund input.
  Sign-in has no credential inputs and does not fabricate a session. Dialog
  focus cycles with Tab/Shift-Tab, Escape dismisses and focus returns to its opener.
  The final captured warning/error log was empty. Viewport overrides were reset.
- On the separate 3101 origin, an initially empty agency demo received one
  disposable fictional QA workflow. It survived navigation into the preview and
  back, then only that record was deleted. Preview QA workspaces were discarded
  by leaving; the original user server/storage origin was not modified.
- Startup generated `frontend/AGENTS.md` with the installed Next guidance. No
  packages, legacy models/persistence/calculation logic, classifier or server code
  changed. This task does not verify real frontend auth, user isolation, cloud
  persistence, analysis, ROI or measurement endpoints. Those flows remain pending;
  B's earlier Python/SQL/hosted results below were not rerun here.
- Final source/document checks resolved 39 local links and balanced fences in
  eight documents. Seven captured SHA-256 values matched for legacy models,
  persistence, analysis, ROI, examples and both dependency manifests. Field sets
  matched 12 TypeScript/Pydantic interfaces plus PATCH and four enum sets; health
  includes `not_checked`. Preview source has no browser-storage access, legacy
  matcher/ROI imports or HTTP client construction. All three screenshot files exist.

## Member B standalone API follow-up — 20 October 2026 (Asia/Karachi)

Resolved WinError 10048: a verified older Gainvera process occupied port 8000.
It served only the old health route. Stopped that instance, started the current
API, and confirmed real HTTP 200 for health/docs/OpenAPI, 401 for unauthenticated
workspace access, 200 for PATCH CORS preflight and 200 for workspace access using
a real test user's Supabase token. No credentials or records were displayed.
The API was left running at 127.0.0.1:8000. This resolves the earlier standalone
verification gap described below. Full details: backend record (gainvera-backend: `server/VERIFICATION.md`).
No application code changed or frontend/Python/SQL suites were rerun for this
restart. Project context, changelog and startup troubleshooting were updated.

## Member B persistence — 20 October 2026 (Asia/Karachi)

Backend workspace/workflow storage and verified Supabase Auth are implemented;
two migrations were deployed. The full Python suite passed 138 tests, with its
two-user live test initially skipped. After dedicated accounts were configured,
both real hosted tests passed with zero skips. Twenty SQL/RLS tests passed on
embedded PostgreSQL. Official Supabase database advisors returned zero findings
after a follow-up migration. Ruff/dependency checks passed. See
the detailed backend record (gainvera-backend: `server/VERIFICATION.md`) for commands, changed files,
mocked-versus-live coverage and final focused documentation checks.

The standalone API startup/TCP smoke check was not executed: automatic approval
review hit an account usage limit. Health/docs passed through TestClient.
No frontend/C files were edited or frontend checks rerun in this backend task.
Member A's login/data UI integration remains pending; prior A checks below
are historical, not a new combined application verification.

## Member A frontend API foundation — 20 October 2026 (Asia/Karachi)

- From `frontend/`, `npm run lint` and `npm run typecheck` passed.
- `npm test` passed all 38 tests, with 0 failures: 22 new adapter/client/fixture
  tests plus the 16 existing demo engine tests. New checks cover request field
  whitelists, unknown/default and invalid values, baseline/status retention,
  nullable provenance, split measurements and rejection of legacy outcome
  conversion. HTTP tests cover fresh token supply, public health, field errors,
  status/correlation/retry metadata, malformed and empty responses, empty 204
  deletion, network/read failures, cancellation and explicit fixture isolation.
- `npm run build` initially failed in the restricted sandbox with access denied
  while canonicalizing the frontend path. It passed with local execution
  permission, including TypeScript and static generation. After the final client
  changes, lint, typecheck, all 38 tests and the production build passed again.
- A Python AST/source comparison matched field names for 11 TypeScript/Pydantic
  domain types and the four risk/data/family/recommendation enum sets. This check
  does not prove every runtime validation constraint or service integration.
- Relative Markdown links and balanced code fences were checked in the seven
  changed/new documents. SHA-256 values for the existing `models.ts`,
  `persistence.ts`, `gainvera.tsx`, `engine.test.ts`, `package.json` and lockfile
  matched the values captured at task start. No packages or server code changed.
- New HTTP tests inject fetch responses; no real auth, database, ML, AI, business
  endpoint or browser interaction was exercised. Backend source was inspected
  and still registers only the health router. Backend checks dated below were
  not rerun. The API module is not imported by the current demo and never reads
  or uploads its stored browser records. Browser/live HTTP checks were not needed
  for this isolated module change and are not claimed as completed.

## Folder reorganization — 19 October 2026

The frontend now lives in `frontend/`, with the FastAPI application in `server/`.
Startup instructions, source references and ignore patterns were updated to
match those directories. Application source and calculation logic were unchanged.

- From `frontend/`, `npm ci --no-audit --no-fund` restored 401 packages using the
  existing lockfile. npm reported a deprecation notice for the pinned ESLint
  release and blocked two dependency install scripts under its current policy;
  all checks below still passed without changing dependency versions or policy.
- From `frontend/`, `npm run lint`, `npm run typecheck`, `npm test` (16 passed)
  and `npm run build` all passed.
- `npm start` served the production frontend at `http://localhost:3100`.
  PowerShell confirmed HTTP 200, the Gainvera page title and HTTP 200 for all
  eight referenced JavaScript/CSS assets.
- From `server/`, `.venv\Scripts\python.exe -m pytest -q` passed all 60 tests.
  Ruff lint and formatting checks passed; `pip check` found no broken requirements.
- The already-running backend returned HTTP 200 for `/health` and `/docs` on
  `http://127.0.0.1:8000`. OpenAPI still listed only `/health`. The health response
  reported all four external dependencies as `not_implemented`, `checked=false`.
  A second launch encountered the occupied port; the existing process was kept.
- All relative Markdown links in the project, frontend, backend and handoff docs
  resolved. TypeScript aliases and backend contract/document paths worked from
  their current locations.

These checks cover the folder move, build and HTTP serving. The interactive
browser walkthrough below was performed earlier and was not repeated for this
documentation/ignore-rule change. The frontend remains a local demo and has not
been connected to the backend. See backend verification (gainvera-backend: `server/VERIFICATION.md`)
for the foundation tests and limitations.

## Original frontend demo — 8 October 2026

Verified in the provided Windows workspace before the folder reorganization.

- Dependency installation completed: 401 packages. The package lock records the resolved dependency versions.
- `npm test`: 16 tests passed, 0 failed. Coverage includes all four sample categories, unknown tasks, high-risk overrides, unknown input guardrails, input validation, monthly hours, setup/recurring ROI, zero and negative financial outcomes, payback, and self-reported versus estimated results.
- `npm run typecheck`: passed. Production builds also completed TypeScript checking.
- `npm run lint`: passed with no warnings after fixes.
- `npm run build`: production build passed. The sandbox initially denied Turbopack workspace-path access; running the authorized build outside the sandbox resolved that restriction.
- Production HTTP response: 200 with the Gainvera title on port 3100. Port 3000 is already used by another application.
- Browser checks: sample loading, analysis, all four categories, filtering, client reporting plan, live ROI slider recalculation, persistence after reload, hypothetical outcome save, results comparison, audit preview, HTML download, workflow creation/edit/deletion, and demo reset. Verification records were cleared and the six examples were reloaded with no measurements.
- Responsive layout inspected at the normal narrow viewport, a 1440-pixel desktop breakpoint, and a 390-pixel mobile breakpoint. At mobile, the actual content viewport and page widths both measured 375 pixels; no horizontal overflow. The final browser log check returned no warnings or errors.
- The native month input did not accept the automated entry. It was replaced with a validated YYYY-MM text field; the follow-up measurement was then saved successfully.
- The HTML audit download completed. The browser print button opened a blocking native print flow; automated completion of a PDF export was not verified. Use Download HTML as the verified local export path, or complete browser printing manually.

All measurements entered during verification were explicitly marked hypothetical demo data. No independently verified outcome is claimed.
