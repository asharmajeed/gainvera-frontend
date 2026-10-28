# Gainvera frontend context

Last updated: 2026-10-28 (Asia/Karachi; Member B final combined acceptance).

Latest change: **B final combined acceptance PASS for local REVIEWED-PLAYBOOK
FALLBACK.** A integration is complete; fresh 85 frontend and 200 backend/26 SQL
checks plus the real two-user journey pass. No application source changed in
acceptance. **No further member implementation needed.**
[Exact candidate/results](../gainvera-backend/docs/FINAL_ACCEPTANCE.md).

## Scope and current status

This copy contains `frontend/` and supporting documentation. It contains no
`server/` or `data/`; those belong together in `gainvera-backend`.

- `/`: preserved local agency demo with browser storage and local calculations.
- `/ecommerce`: explicit in-memory fixtures, simulated recommendations, scenario
  arithmetic, measurements and HTML reports; edits reset on reload/navigation.
- `/ecommerce/account`: real Supabase Auth and owner-scoped workspace/workflow
  CRUD; reviewed analysis, saved scenarios and authoritative server ROI;
  paginated baseline/measurement history, server dashboard and authenticated HTML
  report download. No real request failure becomes fixture success.
- Analysis/scenario state envelopes drive readiness. A same-baseline analysis
  rerun invalidates its scenario. Scenario CAS preserves the exact timestamp
  string; first save per analysis sends null. Conflicts retain drafts and require
  explicit outcome reads/reconciliation. Old views cannot receive late results,
  errors or downloads. Current 401 clears protected state without replay.
- Measurements deliberately select original baselines and preserve their cost.
  Dashboard nulls remain unestimated; individual periods/versions are separate.

Node 22+, Next.js 16.4.3, port 3100. Configure ignored `frontend/.env.local` from
the placeholder example for another checkout. This workstation has public-only
configuration; passwords/tokens/backend secrets are never public variables.
Companion API remains on 8000; 3101 is fixture-only. See [setup](README.md).

## Ownership, contracts and decisions

A owns this repository. B owns the authoritative API contract in the backend
repository; [this API document](docs/api-contract.md) is a refreshed v2 reference.
[API source](docs/API_SOURCE.md) records backend base 76a8758 plus local uncommitted
implementation and contract hashes. The remote/base commit alone is insufficient.
C's integrated classifier and reviewed playbooks reach this UI through B's API.
Selected mode is reviewed fallback; no live-AI connectivity or savings is claimed.

Preserve the six task families, four action categories, snake_case wire keys,
unknown risk/data states, original-baseline comparisons and explicit provenance.
No automatic store actions, fixture uploads or invented ML/savings claims.

## Verification and handoff

B's fresh combined acceptance passed: 85 frontend tests and static/build/audit
checks, 200 backend tests, 26 SQL and C release checks, plus the real combined
journey. No further member implementation is needed. Exact current evidence is
in the companion [final acceptance](../gainvera-backend/docs/FINAL_ACCEPTANCE.md).
The following paragraph preserves A's earlier integration-stage evidence;
backend-suite exclusions in that paragraph refer to A's task, not B's final run.

Actual 28 October checks in this repository: lint, typecheck, all 85 tests,
production build and npm audit (zero findings) pass. Real Supabase/API checks
covered the result journey, negative ROI, same-baseline rerun, two-tab scenario
409, duplicates, pagination, dashboard/report, account switch and 14 cross-owner
404 probes. Desktop and 390×844 mobile inspected; agency's six records preserved.
Unavailability/401/late-response branches use injected tests; no live JWT-expiry
wait, full screen-reader audit, backend suite rerun or deployment is claimed.
See [verification](VERIFICATION.md) and [A's handoff](docs/MEMBER_A_FRONTEND_HANDOFF.md).
Repository-layout check results are in [split verification](docs/REPOSITORY_VERIFICATION.md).

Read [the imported combined-workspace snapshot](docs/WORKSPACE_SNAPSHOT.md) for
historical detail. It is not a claim that companion source exists here. The
original project and these copies do not synchronize automatically. After team
adoption, maintain this context and [changelog](docs/CHANGELOG.md) with frontend
changes. [MVP handoff](docs/MVP_HANDOFF.md) and its changed-file manifest are the
completed A integration snapshot. B has now accepted the combined local fallback
MVP, with no further A/B/C implementation needed. No source drift or C blocker.
Live provider/deployment/savings remain outside the accepted scope; working
changes are still uncommitted/unpublished.
