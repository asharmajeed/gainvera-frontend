# Gainvera frontend context

Last updated: 2026-10-22 (Asia/Karachi; repository preparation).

Latest change: prepared the frontend source as a separate repository copy.
No remote, Git history, deployment or new application feature is created.

## Scope and current status

This copy contains `frontend/` and supporting documentation. It contains no
`server/` or `data/`; those belong together in `gainvera-backend`.

- `/`: preserved local agency demo with browser storage and local calculations.
- `/ecommerce`: explicit in-memory fixtures, simulated recommendations, scenario
  arithmetic, measurements and HTML reports; edits reset on reload/navigation.
- `/ecommerce/account`: real Supabase email/password Auth and owner-scoped
  workspace/workflow storage, with paging and stale-edit review.
- History/measurement account UI binding remains the next A task. Analysis,
  scenario/dashboard/report integration awaits B's APIs. No fixture fallback.

Node 22+, port 3100. Configure your own ignored `frontend/.env.local` from the
placeholder example; no configuration or installed dependencies were copied.
The companion API remains on 8000. See [setup](README.md).

## Ownership, contracts and decisions

A owns this repository. B owns the authoritative API contract in the backend
repository; [this API document](docs/api-contract.md) is an initial reference
snapshot. Agree changes and record the source backend version/commit on updates.
C's classifier, dataset and playbooks reach this UI through B's API.

Preserve the six task families, four action categories, snake_case wire keys,
unknown risk/data states, original-baseline comparisons and explicit provenance.
No automatic store actions, fixture uploads or invented ML/savings claims.

## Verification and handoff

Prior frontend evidence: 21 October 2026, 70 tests, lint, typecheck, production
build and real two-user Auth/storage browser checks passed. Those checks were
not rerun for this source-only split. Existing limitations remain in
[verification](VERIFICATION.md) and [A's handoff](docs/MEMBER_A_FRONTEND_HANDOFF.md).
Repository-layout check results are in [split verification](docs/REPOSITORY_VERIFICATION.md).

Read [the imported combined-workspace snapshot](docs/WORKSPACE_SNAPSHOT.md) for
historical detail. It is not a claim that companion source exists here. The
original project and these copies do not synchronize automatically. After team
adoption, maintain this context and [changelog](docs/CHANGELOG.md) with frontend
changes; send shared-contract handoffs to B explicitly.
