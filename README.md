# Gainvera frontend

Member A's Next.js application. The backend, database migrations, synthetic data
and trained classifier are maintained together in the companion
`gainvera-backend` repository. Set this repository's GitHub description or README
to link to that repository once its actual URL is known.

```text
gainvera-frontend/
  frontend/             Application, tests, package.json and package-lock.json
  docs/                 Team documentation and API reference snapshot
  AGENTS.md
  PROJECT_CONTEXT.md
  VERIFICATION.md       Current checks, followed by dated historical evidence
  COPY_MANIFEST.json    Original hashes for unchanged non-Markdown source files
  .gitignore
```

**Final local acceptance: PASS, reviewed-playbook fallback (28 October 2026).**
A integration and B combined acceptance are complete. No further member
implementation needed. [Exact candidate/results](../gainvera-backend/docs/FINAL_ACCEPTANCE.md).
Source/locks are unchanged by acceptance; changes remain uncommitted/unpublished.
Live provider/deployment/store actions/savings validation are outside this scope.

## Setup

Requires Node 22+ and npm. From this repository root:

```powershell
Set-Location frontend
npm ci
if (-not (Test-Path .env.local)) {
    Copy-Item .env.example .env.local
}
```

Copy the example only when `.env.local` does not already exist. Fill it privately
with your Supabase URL, public publishable key and backend API URL. No real
configuration, account passwords, installed dependencies or build output are
included. Never put backend secrets in public frontend variables.

```powershell
npm run dev
```

Open http://localhost:3100. The agency demo at `/` and fixture preview at
`/ecommerce` run locally. `/ecommerce/account` requires confirmed Supabase users,
configured public variables, internet access and the companion API on port 8000.
Local Auth/API integration uses port 3100; port 3101 is fixture-only.

Real sign-in, workspace/workflow CRUD and B's v2 result flow are integrated:
reviewed analysis, saved scenarios with authoritative ROI, original-baseline
measurements, a complete server dashboard and authenticated HTML downloads.
The fixture preview remains simulated. Read the [current handoff](docs/MVP_HANDOFF.md)
for actual live checks, remaining limits and B's final combined acceptance task.

## Checks

From `frontend/`:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

The current v2 assignment ran these checks and live two-account browser checks.
See [verification](VERIFICATION.md), [detailed setup](frontend/README.md),
[frontend handoff](docs/MEMBER_A_FRONTEND_HANDOFF.md) and
[API reference](docs/api-contract.md).

## Team workflow

Work on task branches in this repository. B owns the authoritative API contract
in `gainvera-backend`; this repository includes a v2 reference snapshot.
[API source](docs/API_SOURCE.md) records B's local revision and source hashes;
the required backend implementation is uncommitted and must be shared separately.
Update this repository's context and changelog with each task. The original
combined folder and these copies do not synchronize automatically. Once the
team adopts the two repositories, make future frontend changes here and backend
or ML changes in the companion repository. See [GitHub setup](docs/GITHUB_SETUP.md).
