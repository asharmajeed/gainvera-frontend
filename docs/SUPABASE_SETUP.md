# Gainvera Supabase setup

Updated 21 October 2026. All three database migrations are applied to the hosted
project, including the measurement-pagination index. Official security/performance
advisors returned **zero findings**. See actual checks (gainvera-backend: `server/VERIFICATION.md`)
for live test coverage. Frontend login/data bindings are Member A's next stage.

## 1. API settings: server/.env

Copy `server/.env.example` to `.env` only if absent. In Supabase **Connect** find
the project URL; in **Settings → API Keys** find the publishable key. Edit locally:

```dotenv
SUPABASE_URL=https://yourprojectref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_LOCALLY
```

This is a hosted HTTPS API origin. The publishable key identifies the app;
business requests also need a user's access token. No secret/service-role key
or database password belongs here. Blank values allow health/docs only.
See [official API keys](https://supabase.com/docs/guides/getting-started/api-keys).

Optional public Auth connectivity probe, from `server/`:

```powershell
.\.venv\Scripts\python.exe -m app.check_supabase
```

Its bounded GET to `/auth/v1/settings` prints safe status fields. `reachable`/200
proves public Auth connectivity only. Other statuses exit 1. Startup and health
do not run it or assert external readiness.

## 2. Database administration: server/.env.admin

The earlier HTTPS project URL is **not** the database URI.

| Value | Format | Purpose |
| --- | --- | --- |
| API URL | `https://yourprojectref.supabase.co` | Auth and normal data access |
| DB URI | `postgresql://postgres.yourprojectref:...@...pooler.supabase.com:5432/postgres` | Private migration administration |

Copy `.env.admin.example` to `.env.admin` only if absent. In Supabase **Connect →
Session pooler**, copy the URI on port **5432**. Replace `[YOUR-PASSWORD]` locally
with the database password chosen at project creation. URI-encode special
password characters. Save privately:

```dotenv
SUPABASE_DB_URL=postgresql://postgres.YOUR_PROJECT_REF:ENCODED_PASSWORD@YOUR_SESSION_POOLER_HOST:5432/postgres
```

Do not copy this placeholder literally. Direct DB access may require IPv6;
Session pooler works on this workstation. See
[official connection options](https://supabase.com/docs/guides/database/connecting-to-postgres).

Review the SQL in `server/supabase/migrations/`, then run from `server/`:

```powershell
.\.venv\Scripts\python.exe scripts\migrate.py
.\.venv\Scripts\python.exe scripts\migrate.py --apply
```

Default is dry-run only. The helper validates the target project, resolves CLI
2.121.0 and suppresses raw credential-bearing errors. First use needs Node/npm
and network. `dry_run_passed` is not deployment; `applied` means pending migrations
completed. The CLI tracks applied versions. Never edit deployed SQL; add a new
CLI-created migration.

Safe errors: `database_password_rejected` means check the database password;
`database_url_invalid_or_wrong_project` means copy this project's URI again;
`database_connection_unavailable` means check project/network state. Never debug
by printing the URI. The API does not load `.env.admin`.

## 3. Two test users: server/.env.integration

These are **two Gainvera users**, not two Supabase dashboard accounts. Neither
uses your dashboard login password.

1. Open **Authentication → Users → Add user/Create user** in the project.
2. Create two different dedicated test users with private passwords. Enable
   **Auto confirm** if offered, or confirm both emails before testing.
3. Open `server/.env.integration`; copy `.env.integration.example` if absent.
4. Replace these values locally with the accounts just created:

```dotenv
GAINVERA_LIVE_TESTS=1
GAINVERA_TEST_USER_A_EMAIL=YOUR_FIRST_TEST_EMAIL
GAINVERA_TEST_USER_A_PASSWORD=YOUR_FIRST_TEST_PASSWORD
GAINVERA_TEST_USER_B_EMAIL=YOUR_SECOND_TEST_EMAIL
GAINVERA_TEST_USER_B_PASSWORD=YOUR_SECOND_TEST_PASSWORD
```

Quote dotenv values containing `#` or spaces. Keep all three ignored environment
files separate. Never share passwords or the actual file in chat. Share only
placeholder example files. Do not use customer accounts.

From `server/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -m live -q
```

This signs in both users, uses real tokens, saves/reads/edits/deletes owned
workflows, attempts cross-user access through FastAPI and direct Data API, and
checks historical baseline preservation. It cleans its temporary workspaces and
children; Auth accounts remain. Missing flag/accounts cause an explicit skip;
a failed login is a test failure. See verification (gainvera-backend: `server/VERIFICATION.md`).

## 4. Frontend and remaining work

Read [A's handoff](MEMBER_A_BACKEND_HANDOFF.md) and the [API contract](api-contract.md).
A supplies Supabase login and current access tokens to the prepared client.
Backend verification uses the supported
[getUser method](https://supabase.com/docs/reference/python/auth-getuser).
When A adds login callbacks, set hosted Auth site/redirect URLs to those actual
frontend routes. Local CLI config uses port 3100; migrations do not push hosted
Auth settings.

C supplies genuinely reviewed playbooks/provenance; an administrator imports
them separately. No guidance/review claims were seeded. ML/AI, analysis/ROI and
measurement HTTP routes remain planned. See database design (gainvera-backend: `server/supabase/README.md`)
and startup/tests (gainvera-backend: `server/README.md`).
