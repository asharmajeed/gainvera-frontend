> Replace `<clone-parent>` with your local clone parent directory.
> The repository root README provides setup commands relative to the checkout.

# Gainvera frontend

This folder contains the Next.js agency demo at `/` and a separate e-commerce
development preview at `/ecommerce`. The agency demo retains its existing
LocalStorage records and local analysis. The preview uses explicit fictional
fixtures and an in-memory state model; leaving or reloading it discards edits.
The separate `/ecommerce/account` screen provides real Supabase email/password
sign-in and owner-scoped workspace/workflow storage. Account data and fixtures
never share a state model or automatically migrate between sources.

The [API foundation](src/lib/api/README.md) now includes v1.1 PATCH, page and health
types/bindings. B's implemented Supabase auth/storage backend is in `../server/`;
frontend account integration uses the official Supabase JS SDK. Fixture mode needs no
credentials and is never selected automatically after an HTTP failure.

## Windows PowerShell

Requires Node.js **22+** and npm (the installed Supabase SDK requires Node 22).
Install the versions in the lockfile, then start:

```powershell
Set-Location '<clone-parent>\gainvera-frontend\frontend'
npm ci
npm run dev
```

Open [Gainvera](http://localhost:3100). No API keys are needed for this demo.
The `.env.example` explains the current environment requirements. Keep future
backend secrets in `server/.env`, never in frontend public variables.

Open [the e-commerce preview](http://localhost:3100/ecommerce), or use the
**E-commerce preview** link in the agency demo. It provides workspace selection
and creation, six fictional input examples, workflow create/edit/delete with
confirmation, search/status filters, baseline history and an unconnected sign-in
presentation with no credential collection. The six task topics are authored UI
examples, not classifier predictions or training data. Unknown risk/data remain valid.

Open a workflow for **Recommendation**, **Scenario & ROI**, **Measurements** and
**Inputs & history**. The recommendation selector shows clearly simulated success,
clarification, abstention, unavailable, loading and HTTP/network error examples;
they are static references and never analyze the selected workflow or save results.
Family, final recommendation, priority and confidence are separate. No model,
provider call, reviewed guidance or actual performance is claimed.

Scenario reductions start blank. Enter five assumptions or explicitly choose
illustrative values, then **Keep scenario in preview**. Local arithmetic follows
the contract, preserves negative results and shows no positive payback for
nonpositive net value. Future API calculations are authoritative. Measurements
require YYYY-MM, an available original baseline, separate production/review and
maintenance hours, fees and an inclusive setup cost. Keep the hypothetical label
for examples; self-reported entries remain unverified local data.

**Scenario & result overview** shows current-baseline coverage and separate
measurement periods/versions. **Preview report** can download escaped, standalone
fixture HTML; open it and use browser Print / Save PDF manually. No dashboard or
report API schema is invented, no endpoint is called, and no measured savings are
aggregated across months/baselines. The response gallery is omitted from reports.

Changed baseline facts increment the local version and require reanalysis.
Historical measurements retain their original version/cost; no legacy combined
outcomes are migrated. Preview loading/error/empty states and dialog keyboard
navigation are included; result tabs support arrow keys/Home/End. All preview
records are fixtures, including user edits. Unkept form drafts are discarded when
switching result tabs. Nothing persists beyond this preview session.

If an older frontend is already using 3100, leave it running and review on a
separate port from this folder:

```powershell
.\node_modules\.bin\next.cmd dev --hostname 127.0.0.1 --port 3101
```

Then open [the separate preview](http://127.0.0.1:3101/ecommerce). An older
production process may need a deliberate restart to discover the new route.
Browser storage belongs to its exact origin; do not migrate records between
ports/hostnames automatically. `next dev` also generates `frontend/AGENTS.md`
with guidance for the installed framework version.

## Real account setup and review

Copy `.env.example` to ignored `.env.local` in this folder. Set only:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_with_public_key
NEXT_PUBLIC_GAINVERA_API_URL=http://127.0.0.1:8000
```

Use a public `sb_publishable_` key, never service/secret keys, DB credentials,
passwords or access/refresh tokens. Public variables are compiled into browser
code; restart development or rebuild production when they change. This repository copy includes no `.env.local`; configure your own public
values. No account passwords belong in that file. Dedicated live test users remain in private test configuration.

Start B's API on **8000**, this frontend on **3100**, and open
[the real account workspace](http://localhost:3100/ecommerce/account). Use an
existing confirmed email/password account. Sign-in requires internet access to
Supabase. Missing/invalid configuration shows a limitation without credential
fields. Local account pages on other ports are blocked before Auth/API requests;
**3101 is for fixture-only development**, outside B's CORS allowlist. It is not
an integration workaround. Allowed origins are localhost/127.0.0.1 on 3100.

The browser SDK restores its own stored session and renews tokens. The API token
supplier reads the current SDK session for each request; the backend verifies
the token and ownership. Auth callbacks are synchronous and never await SDK work.
Sign-out uses `scope: local`, clears account state immediately, and preserves
agency LocalStorage. All tabs at that origin receive SDK auth changes. A failed
sign-out is reported with retry instructions, not a false success. A business
401 clears displayed data and requires sign-in without replaying the request.

Create/select a workspace, choose page size and load further cursor pages. Page
state and drafts reset on workspace/account changes. Refresh workspaces/page
size resets selection. Add, open, edit and confirm deletion of saved workflows.
PATCH includes the expected baseline version; 409 retains the draft and fetches
the latest record. Review every field, reconcile edits, then explicitly accept
the latest version and save again, or discard the draft. This never retries a
write automatically. Network failures can leave a write outcome unknown: refetch
before resubmitting. Errors preserve field paths, request IDs and retry hints.

The account store cancels and rejects responses/errors from old account/workspace
generations, including transports that ignore abort. No fixture source is imported
or selected after a failure. No agency/fixture records are read or uploaded.
Analysis, scenario, measurement, dashboard and report UI services are not connected
here. B's v1.2 baseline/measurement routes now exist; binding them is a later task.

Implementation follows official Supabase documentation for
[initialization](https://supabase.com/docs/reference/javascript/initializing),
[password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword),
[session reads](https://supabase.com/docs/reference/javascript/auth-getsession),
[auth events](https://supabase.com/docs/reference/javascript/auth-onauthstatechange),
[automatic refresh](https://supabase.com/docs/reference/javascript/auth-startautorefresh)
and [local sign-out](https://supabase.com/docs/reference/javascript/auth-signout).

## Checks and production build

Run these commands from this folder:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Stop the development server before starting the production server on the same
port. Dependencies and `.next/` are generated locally and should not be shared
as source files.

See the [project README](../README.md) for the demo walkthrough and calculation
methodology, and [the API contract](../docs/api-contract.md) for planned integration.
Source aliases such as `@/lib/models` and `@/lib/api` resolve inside `src/`.

See [A's dependency handoff](../docs/MEMBER_A_FRONTEND_HANDOFF.md) for exact B/C
inputs and the first real integration task, and [verification](../VERIFICATION.md)
for checks actually run. Real Auth/storage browser checks used two dedicated
accounts on both allowed 3100 origins. Analysis/scenario/dashboard/report routes
remain planned; baseline/measurement routes exist but are not bound to this UI.
