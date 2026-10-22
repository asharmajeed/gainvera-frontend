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
  VERIFICATION.md       Imported, dated verification from the combined workspace
  COPY_MANIFEST.json    Original hashes for unchanged non-Markdown source files
  .gitignore
```

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

Real sign-in and workspace/workflow CRUD are integrated. Account analysis,
scenarios, measurements, dashboards and reports remain unconnected. Fixture
results do not establish working account services.

## Checks

From `frontend/`:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

No new application build or frontend suite is implied by the repository split.
See [verification](VERIFICATION.md), [detailed setup](frontend/README.md),
[frontend handoff](docs/MEMBER_A_FRONTEND_HANDOFF.md) and
[API reference](docs/api-contract.md).

## Team workflow

Work on task branches in this repository. B owns the authoritative API contract
in `gainvera-backend`; this repository includes an initial reference snapshot.
Record the backend contract version or commit used whenever updating that copy.
Update this repository's context and changelog with each task. The original
combined folder and these copies do not synchronize automatically. Once the
team adopts the two repositories, make future frontend changes here and backend
or ML changes in the companion repository. See [GitHub setup](docs/GITHUB_SETUP.md).
