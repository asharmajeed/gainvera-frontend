# Member A: connect login and workflow storage

Updated 21 October 2026 for API v1.2: baseline history and measurement routes
are now working. Existing workspace/workflow wire fields and behavior remain
compatible. The ROI engine is a Python service, with no ROI HTTP endpoint yet.

The backend saves workspaces/workflows in Supabase and enforces one owner per
workspace. Your demo and prepared API module are preserved. Full fields and
examples: [API contract](api-contract.md).

Member A status, 21 October 2026: real email/password Auth and workspace/workflow
CRUD are bound at `/ecommerce/account`, with two-account browser verification.
Public environment names and Node 22+ setup: [frontend README](../frontend/README.md).
Remaining scope and verification limits: [A's handoff](MEMBER_A_FRONTEND_HANDOFF.md).
The v1.2 history/measurement bindings below remain a separate frontend task.

## Authenticate

Use Supabase Auth in the frontend with the project URL and publishable key.
After sign-in, supply the current session's **access_token** through the prepared
`createHttpClient` token-supplier hook on every request:

```http
Authorization: Bearer <current Supabase access_token>
Content-Type: application/json
```

The backend verifies the token independently online using Auth's getUser endpoint.
Do not send refresh tokens, owner IDs, database URI/password or service keys.
The Supabase client manages session renewal; on 401 refresh/re-authenticate.
No frontend Auth package, login UI or environment names were added by B.

Local API: `http://127.0.0.1:8000`. Allowed frontend origins:
`http://localhost:3100` and `http://127.0.0.1:3100`. CORS supports JSON, bearer
headers, PATCH/DELETE, and exposes `X-Request-ID`. This API uses no cookies.

## Call this flow

1. `GET /workspaces` returns `items` and nullable `next_cursor`.
2. `POST /workspaces` with `{"name":"NovaCart","currency":"USD"}` if needed.
   Use the returned `id`; never supply an owner.
3. `POST /workflows` with that `workspace_id` and documented intake fields.
   Returns the complete workflow, version 1, `not_analyzed`.
4. `GET /workflows?workspace_id=<id>` or `GET /workflows/{id}` retrieves saved
   records. Lists accept `limit=1..100` (default 50) and an opaque `cursor`.
   `next_cursor=null` means the end.
5. `PATCH /workflows/{id}` with expected version and editable fields, e.g.
   `{"baseline_version":1,"hourly_cost":25}`. Changed facts increment the version
   and set `needs_reanalysis`. On 409 refetch and let the user reconcile their
   edit. Omit unchanged fields; nulls, protected fields and empty edits fail.
6. `DELETE /workflows/{id}` returns 204 with no JSON. Confirm in the UI first:
   this removes the workflow's history/results too.
7. Optional `GET /playbooks`: reviewed read-only library. Empty means no reviewed
   content was imported, not a completed analysis or successful AI integration.

Analysis/scenario/ROI/dashboard/report HTTP routes remain planned. Keep their
fixtures explicitly labelled. Never substitute fixtures after an HTTP failure.
Do not automatically upload old browser records or convert legacy measurements.

## Update the prepared client/types

The prepared client already supports v1.1 pages/PATCH/health. Keep those working.
The additional v1.2 bindings needed when A connects results are:

- `GET /workflows/{id}/baselines`: `ApiPage<ApiWorkflowBaseline>`, where an item
  has `workflow_id`, positive `baseline_version`, `snapshot: ApiWorkflow`, and
  `created_at`. Snapshot contains original cost/time/frequency and task facts.
  Fetch pages until `next_cursor=null` to find the explicitly selected version.
- `POST /workflows/{id}/measurements`: existing ApiMeasurementInput, returns
  ApiMeasurement directly with 201. The prepared createMeasurement call can use
  this real route; its UI binding remains A's work.
- `GET /workflows/{id}/measurements`: `ApiPage<ApiMeasurement>`, all versions.
  Join each record to the matching original snapshot, never today's workflow.
- Both lists accept limit 1–100, default 50, and a route/user/workflow-scoped
  cursor. Baseline order is version ascending; measurement order is creation
  time then UUID ascending. Do not send a baseline cursor to a measurement list.
- Retrospective measurement POST deliberately accepts an older existing version;
  no silent rebasing. Missing/foreign workflow or missing baseline is 404,
  duplicate workflow/version/month 409, invalid/generated fields 422. Existing
  records are not overwritten on duplicates. Show the selected version and cost
  before saving. No PATCH/DELETE measurement route exists in this phase.
- Health continues to report database/auth `not_checked`, ML/AI `not_implemented`,
  with every `checked` flag false. History endpoints are not a readiness probe.
- Keep page/query state per user/workspace; clear selected data on sign-out or
  account change. Cursors do not authenticate or grant cross-user access.
- Handle 401 login, 404 missing/inaccessible, 409 stale edit, 422 validation and
  503 dependency failure. Keep request IDs for safe diagnostics. A network-failed
  POST may have saved data: refetch before blindly retrying; POST idempotency is
  not implemented yet.

A verified two real browser sessions for login and workspace/workflow CRUD.
History/measurement UI and the remaining results flow need their own integration
checks. Backend tests verify Auth/storage/RLS, not future frontend bindings.

Full v1.2 examples and error semantics are in [the API contract](api-contract.md).
[ROI service documentation](ROI_SERVICE.md) contains the authoritative backend
formulas and tested example. Your labelled local preview is not an HTTP result;
future scenario integration will call the backend calculation service.
