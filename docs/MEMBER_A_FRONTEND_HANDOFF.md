# Member A: authenticated storage and next integration handoff

Updated 21 October 2026 (Asia/Karachi). This working copy has no Git repository.
Read alongside [B's v1.2 handoff](MEMBER_A_BACKEND_HANDOFF.md),
[API contract](api-contract.md), [frontend setup](../frontend/README.md) and
[actual verification](../VERIFICATION.md). No shared wire schemas changed here.

## Completed and how to review

Run the frontend on **3100**, backend on **8000**, and open
[the account workspace](http://localhost:3100/ecommerce/account). Node **22+** is
required by the installed official Supabase JS SDK 2.118.0. The new account screen
is separate from agency `/` and explicit memory-only fixtures at `/ecommerce`.

Public configuration names in `frontend/.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (public `sb_publishable_` key only)
- `NEXT_PUBLIC_GAINVERA_API_URL`

Actual public values are configured in ignored `frontend/.env.local`; restart or
rebuild after changes. Dedicated accounts remain private test configuration.
No passwords, tokens, DB or service credentials belong in source or chat.
Missing/invalid configuration collects no credentials. Port 3101 is fixture-only;
account pages block local origins outside port 3100 before initializing Auth.

A implemented email/password sign-in, local-session sign-out, restoration and
SDK automatic renewal. Each API request obtains the current SDK access token;
B still verifies Auth and ownership. Auth events reset account/workspace data,
pages and drafts. Aborted and late responses/errors cannot populate a new session,
even if transport ignores cancellation. A current 401 clears account data and
requires sign-in; it does not replay the failed request. Sign-out failure is
reported without claiming success. Agency LocalStorage is never cleared.

Real workspace/workflow routes are bound: paginated lists, workspace creation
and selection, workflow creation/read/edit/delete, expected baseline version and
confirmed empty 204 deletion. On 409 the draft stays in the form, the latest
record is fetched, and saving stays disabled until explicit review/reconciliation.
Review every field before keeping the draft against the latest version. Writes
are never automatically replayed; refetch after an uncertain network outcome.
Field errors, request IDs, dependency errors and read-retry controls are visible.

Fixture responses never replace an HTTP failure, and agency/fixture data is never
uploaded. Existing fixture result-state gallery, local arithmetic, original-baseline
measurements, overview and HTML reports remain labelled simulations/local data.
They are not account results or backend-generated guidance.

Main source: `frontend/src/lib/account/{config,supabase,store}.ts`,
`frontend/src/components/ecommerce/account-workspace.tsx`, shared e-commerce
forms/styles and `frontend/src/app/ecommerce/account/page.tsx`.
Tests: `frontend/tests/account.test.ts` (15 new cases, 70 total frontend tests).
No backend, DB schema, dataset/model or legacy agency calculation/storage code changed.

## Checks and practical limits

Lint, typecheck, all **70 tests** and production build passed. Tests inject Auth
and HTTP responses for expiry/401, renewal events, failed sign-out, stale account
reads/errors/writes, workspace changes, mutation/list races, cursors, 409 and
protocol/network failures.

Production browser checks against real Supabase/API used two dedicated users on
`localhost:3100` and `127.0.0.1:3100` (independent browser storage). Sign-in, reload,
workspace/workflow persistence, edits, same-origin account switch, cross-tab
sign-out clearing, confirmed deletion and workflow pagination passed. A real
stale edit from two tabs fetched baseline v2, preserved the draft and saved v3
only after explicit reconciliation. B could not list A's workspace or read A's
workflow: direct non-browser probes returned 404. Desktop and mobile 390x844 were
inspected; mobile form validation had no horizontal overflow. Port 3101 showed
its limitation and no email/password fields. Existing agency records and fixture
preview remained accessible. Browser warning/error capture was empty at the end.

Actual scheduled JWT expiry/automatic refresh was not waited out; this is enabled
through the SDK and covered by injected event/token tests, not a live expiry claim.
Workspace cursor behavior is unit-tested; live cursor paging covered workflows.
No complete analysis/results flow, password recovery/signup, screen-reader audit,
backend Python/SQL suites or production deployment was tested by A.

Three disposable workflows were deleted and both accounts signed out. Two empty
workspaces remain: `Frontend QA A 2026-10-21` and `Frontend QA B 2026-10-21`.
There is no workspace DELETE route; B/admin can remove these test containers if
wanted. Other test/user records were preserved.

`npm audit` reports five high findings in the existing ESLint/fast-glob/micromatch/
braces chain. No Supabase runtime finding was reported. A forced ESLint downgrade
was not applied. See verification for resolved test-double issues and environment
limits; the final production process is available on port 3100 at this check.

## B handoffs and remaining work

No missing public configuration or test-account blocker remains in this copy.
Keep the same API URL, allowed origins and privately configured test access when
sharing copies; ignored local configuration does not synchronize automatically.

B has now supplied v1.2 baseline-history and measurement GET/POST endpoints plus
an authoritative Python ROI service. The account UI does **not** bind them yet.
A can add `ApiWorkflowBaseline`, scoped history/measurement list bindings and
explicit historical-baseline measurement entry in a separately assigned task.
Preserve old costs, all page cursors and duplicate period/version 409 behavior;
that conflict differs from a stale current-workflow PATCH.

B still needs to supply analysis create/read and explicit not-analyzed/failure
semantics, finalize scenario PUT results, expose authoritative scenario/ROI
execution and define dashboard/report schemas/export behavior. Keep request IDs,
retry hints, expected versions and invalidation/retention behavior documented.
Do not invent those endpoints or reuse fixture results in real accounts.

C's synthetic dataset and six draft playbooks are supplied. The drafts are not
reviewed guidance. Classifier artifact/runtime availability, provenance and actual
evaluation, genuinely reviewed/versioned playbooks and explicit recognized/
abstained/unavailable/AI-failure states must reach A through B's analysis API.
The agency matcher never supplies e-commerce model predictions.

## Next task for A

Bind B's existing v1.2 original-baseline history and measurements to the signed-in
account screen, with pagination, retrospective selection and duplicate handling.
Then integrate analysis/scenario/dashboard/report only as B's agreed endpoints
arrive. The requested Auth and workspace/workflow storage tasks are complete;
no further feature implementation is included in this handoff.
