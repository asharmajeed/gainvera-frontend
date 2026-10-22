> Frontend reference snapshot. The backend repository owns the
> authoritative API contract; coordinate updates through B.

# Gainvera API contract for Member A

Persistence/results contract v1.2, 21 October 2026. Backend ownership: Member B. Frontend
ownership: Member A. Discuss breaking changes before changing field names or
units. The executable draft types are in `server/app/contracts/domain.py`.
Wire types are mirrored in `frontend/src/lib/api/types.ts`. The preserved agency
UI types/calculations live in `frontend/src/lib/models.ts` and `frontend/src/lib/roi.ts`;
they are not the e-commerce API contract. All paths here are relative to the project root.

## What is available now

Local base URL: `http://127.0.0.1:8000`. Frontend: `http://localhost:3100`.

| Route | Current status | Authentication |
| --- | --- | --- |
| `GET /health` | Implemented process liveness | Public |
| `GET /docs` | Implemented Swagger HTML | Public |
| `GET /redoc` | Implemented ReDoc HTML | Public |
| `GET /openapi.json` | Implemented schema for available API routes | Public |
| `GET /workspaces` | Implemented paginated owner list | Verified bearer |
| `POST /workspaces` | Implemented; 201 workspace | Verified bearer |
| `GET /workflows?workspace_id=<uuid>` | Implemented paginated owner list | Verified bearer |
| `POST /workflows` | Implemented; 201 workflow | Verified bearer |
| `GET /workflows/{id}` | Implemented; 200 workflow | Verified bearer |
| `PATCH /workflows/{id}` | Implemented; 200 workflow, version check | Verified bearer |
| `DELETE /workflows/{id}` | Implemented; 204 empty body | Verified bearer |
| `GET /workflows/{id}/baselines` | Implemented immutable baseline-history page | Verified bearer |
| `POST /workflows/{id}/measurements` | Implemented; 201 saved measurement | Verified bearer |
| `GET /workflows/{id}/measurements` | Implemented measurement page, all versions | Verified bearer |
| `GET /playbooks` | Implemented; reviewed, read-only library | Verified bearer |
| Analysis/scenario/ROI/dashboard/report routes below | Planned; JSON 404 | Future |

OpenAPI describes health and the eleven implemented business operations above.
The agency frontend remains local. Member A's separate `/ecommerce` preview
uses explicit in-memory fixtures. Member A's `/ecommerce/account` now binds real
Supabase email/password sessions and workspace/workflow CRUD to these routes.
Fixtures and account records remain separate; no wire schemas changed for that binding.
Analysis/scenario routes remain planned. A deterministic ROI Python service is
implemented, but no ROI HTTP endpoint is supplied. Measurement/history routes
return saved facts; they do not perform analysis or generation.

Frontend preparation, 20 October 2026: Member A added a separate
[`frontend/src/lib/api/` foundation](../frontend/src/lib/api/README.md) with
TypeScript types, field adapters, HTTP transport and explicit read-only fixtures.
The follow-up UI task added workspace/workflow preview screens and aligned
PATCH, pagination and health types with v1.1. Local edits are explicitly fixtures,
not database/Auth records. No wire schemas changed. Dashboard, unanalysed-analysis
responses and scenario-result shapes remain planned. See [A's handoff](MEMBER_A_BACKEND_HANDOFF.md).

Health returns `status: "ok"` for process liveness and four dependencies
(`database`, `authentication`, `ml`, `ai`). Database/authentication have
`status="not_checked"`; ML/AI have `status="not_implemented"`. All have
`checked=false`. Health checks no external service and does not prove readiness.

## Shared conventions

- JSON request/response keys use snake_case. UUIDs are strings. UTC timestamps
  use RFC 3339 with an explicit offset. Calendar periods use `YYYY-MM`.
- All currency amounts are USD. Hours are decimal hours: `0.25` = 15 minutes.
  `occurrences_per_month` may be fractional to represent an average.
- Send JSON numbers, not strings such as `"20"`. Numeric inputs must be finite
  and nonnegative. Booleans are not numeric inputs. Unknown fields are rejected.
- Risk: `unknown`, `low`, `medium`, `high`. Data availability: `unknown`,
  `digital`, `manual`. Missing risk/data fields default to `unknown`, never low
  risk or confirmed digital data.
- Task family: `catalog_copy`, `support_reply`, `stock_alert`,
  `catalog_cleanup`, `order_report`, `refund_approval`.
- Recommendation: `AUTOMATE NOW`, `AI-ASSISTED`, `SIMPLIFY WITHOUT AI`,
  `LEAVE ALONE`. There is no fifth recommendation category for clarification.
  Clarification is a separate analysis state with conservative advice.
- New IDs, owner IDs, timestamps, record versions, scores and provenance are
  server-owned. A client cannot set an owner to impersonate another user.
- Successful responses are the documented object, not an extra `data` wrapper.
  List responses use `{"items": [...], "next_cursor": null}`. Never use
  an empty list to conceal an unavailable database.

### Implemented authentication

Member A signs in with Supabase Auth and sends the access token, not the
publishable key, as the bearer credential:

```http
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
X-Request-ID: <optional UUID v4>
```

Every business request calls Supabase Auth's `GET /auth/v1/user` (the supported
getUser verification method). Supabase checks the access token online, including
signature and expiry. Missing/invalid/expired tokens return 401. Anonymous Auth
identities are outside this MVP. Auth/network unavailability returns 503.
The API creates a separate Data API client for each request, forwarding that
user's token and the publishable key. RLS enforces ownership; no privileged key
is used. There is no shared user session or in-memory persistence fallback.
No custom username/password API is implemented in this stage. Do not send refresh tokens
to the business API or place access tokens in URL query strings.

CORS allows the two local frontend origins by default and is configurable.
Bearer `Authorization`, `Content-Type` and `X-Request-ID` are allowed headers;
`X-Request-ID` is exposed to JavaScript. Cookie credentials are not enabled.
Disallowed browser origins get no access-control permission; CORS is not an
authentication mechanism. A simple HTTP request can still reach public health.

### Request IDs and errors available now

Every HTTP response, including CORS preflights, has `X-Request-ID`. A supplied
UUID v4 is normalized and reused; any other value is replaced with a generated
UUID v4. The error body and header use the same ID. Do not put personal data in
a correlation header.

```json
{
  "error": {
    "code": "not_found",
    "message": "The requested resource was not found.",
    "request_id": "ce5d45af-fd7d-47ed-af84-d410385ebc31",
    "details": [],
    "retryable": false
  }
}
```

Validation errors use 422 and an array such as:

```json
{
  "field": "body.hours_per_occurrence",
  "code": "greater_than_equal",
  "message": "The number is below the allowed minimum."
}
```

Raw submitted values, validation context and arbitrary exception details are
excluded. Unknown field names appear as `field` rather than being reflected.
Do not parse message text as a stable identifier; use HTTP status and `code`.

| HTTP status | Public code | Meaning |
| --- | --- | --- |
| 400 | `bad_request` | Invalid request or rejected CORS preflight |
| 401 | `unauthenticated` | Missing, invalid or expired access token |
| 403 | `forbidden` | Generic forbidden condition; owner record routes use 404 |
| 404 | `not_found` | Missing/inaccessible record, parent or planned route |
| 405 | `method_not_allowed` | Wrong method |
| 409 | `conflict` | Stale baseline/version or duplicate database record |
| 422 | `validation_error` | Invalid field(s) |
| 429 | `rate_limited` | Request limit; future enforcement |
| 500 | `internal_error` | Safe generic failure, no traceback or secret |
| 503 | `dependency_unavailable` | Missing configuration/schema, Auth/DB unavailable or invalid provider response |

429/503 envelopes are retryable; rate limiting itself remains planned. Provider
errors are sanitized. A database outage never becomes a success with empty data.
Records owned by another user and nonexistent IDs both return 404. An owned,
empty workspace legitimately returns `items=[]`.

## Planned analysis and results routes

All following routes require verified bearer authentication and workspace
ownership. None of the following HTTP routes are implemented yet.

| Method and route | Planned result |
| --- | --- |
| `POST /workflows/{id}/analyze` | 200 analysis for the current baseline |
| `GET /workflows/{id}/analysis` | 200 current analysis; not-analyzed state handled explicitly |
| `PUT /workflows/{id}/scenario` | 200 scenario, ROI and recalculated priority |
| `GET /dashboard?workspace_id=<uuid>` | 200 owner-scoped totals and ranked entries |
| `GET /reports/{workspace_id}` | 200 escaped UTF-8 HTML report |

Do not register success-shaped stubs. Scenario PUT's result below is proposed;
the dashboard shape and the response for an unanalysed workflow need a future
contract before Member A binds them.

## Implemented list, edit and delete behavior

`GET /workspaces` and `GET /workflows` accept `limit` (integer, 1–100, default
50) and optional `cursor` (opaque string, up to 1024 characters). Workflow lists
require `workspace_id`. Order is ascending `(created_at, id)`. Send the returned
`next_cursor` with the same route, workspace and user; null means the end.
Malformed/wrong-scope cursors return 422. The cursor is a position, not an access
credential; every page still verifies Auth and ownership. This is keyset
pagination, not a frozen snapshot while records are changing.

PATCH requires the last read positive integer `baseline_version` and at least
one editable field. Editable fields are `name`, `description`,
`hours_per_occurrence`, `occurrences_per_month`, `hourly_cost`, `current_tools`,
`pain_points`, `risk`, `data_availability`, `is_sample`. Omit unchanged fields;
explicit null and extra fields return 422. Workspace/owner reassignment and
writing IDs, status, timestamps or a new version are forbidden.

The version comparison is part of the database UPDATE, so a racing/stale edit
returns 409. Refetch and ask the user to reconcile; do not overwrite blindly.
Changing any editable fact increments the version and sets `needs_reanalysis`.
An identical-value edit leaves the version/status unchanged. New workflows start
at version 1, `not_analyzed`. Each version has an immutable baseline snapshot.

DELETE permanently removes the owned workflow and its baseline, analysis,
scenario and measurement children; it returns 204 with no JSON. Keep UI deletion
confirmation. A small audit event remains under the workspace. There is no
workspace DELETE HTTP route in this phase.

## Workspace and workflow objects

Create workspace: `{"name":"NovaCart","currency":"USD"}`. `name` is trimmed,
1–100 characters. Read adds `id`, verified `owner_id` and UTC `created_at`.

Implemented workflow-create request (fictional classroom input):

```json
{
  "workspace_id": "c0ae0b3a-e90c-443b-bc7e-a6c4275b274a",
  "name": "Product description drafting",
  "description": "Draft clothing descriptions from approved material, size and care facts. A person checks every claim before publishing.",
  "hours_per_occurrence": 0.25,
  "occurrences_per_month": 40,
  "hourly_cost": 20,
  "current_tools": "Store product spreadsheet",
  "pain_points": "Repeated drafting and editing",
  "risk": "medium",
  "data_availability": "digital",
  "is_sample": true
}
```

Required: workspace, name, description, hours, frequency and hourly cost. Defaults:
empty tool/pain text, unknown risk/data, `is_sample=false`.

| Field | Limit / meaning |
| --- | --- |
| `description` | Trimmed 8–3000 characters |
| `hours_per_occurrence` | 0–744 hours, includes production/review for one occurrence |
| `occurrences_per_month` | 0–10000 occurrences |
| `hourly_cost` | 0–100000 USD/hour; scenario value, not guaranteed cash saved |
| `current_tools` / `pain_points` | Up to 300 / 500 characters |
| `risk` / `data_availability` | Documented enums, unknown permitted |
| `is_sample` | Boolean: fictional illustrative input |

Read adds `id`, positive integer `baseline_version`, `analysis_status`, UTC
`created_at` and `updated_at`. Status is `not_analyzed`, `analyzed` or
`needs_reanalysis`. Changing baseline facts must invalidate the active analysis
and preserve the original baseline for historical measurements. Do not silently
reuse a previous analysis or compare measurements against changed inputs.

## Planned analysis object

```json
{
  "id": "98122d0b-bafd-4c66-8f08-49dd91467b7e",
  "workflow_id": "f1393f14-ee79-4eae-8e31-dff6743aeb38",
  "baseline_version": 1,
  "task_family": null,
  "recommendation": "LEAVE ALONE",
  "priority_score": 0,
  "priority_components": {"value":0,"feasibility":0,"readiness":20,"safety":30},
  "mode": "needs_clarification",
  "ml_status": "unavailable",
  "ml_confidence": null,
  "model_version": null,
  "playbook_id": null,
  "playbook_version": null,
  "provider_model": null,
  "prompt_version": null,
  "summary": "The classifier is unavailable. No model prediction was made.",
  "steps": [],
  "human_review": "Clarify the task before choosing an improvement.",
  "risks": ["No validated workflow match is available."],
  "missing_information": ["The classifier must be supplied and checked."],
  "created_at": "2026-10-19T12:00:00Z"
}
```

This is an **illustration of a future response**, not a current model result or
reviewed playbook. All confidence/provenance values stay null when unavailable.
The model's score is not the business priority and not a probability of savings.

Future successful modes: `ai_assisted` (live grounded generation),
`reviewed_playbook_fallback` (approved static guidance), `needs_clarification`.
`ml_status` is independently `recognized`, `abstained` or `unavailable`.
Risk rules choose the final recommendation, never the LLM alone. High-risk
decisions retain human authority. Unknown tasks receive no invented reduction.

## Scenario and ROI objects

Planned scenario PUT input; no reduction default is invented:

```json
{
  "baseline_version": 1,
  "reduction_percent": 40,
  "setup_hours": 2,
  "setup_fees": 0,
  "monthly_tool_fees": 10,
  "monthly_maintenance_hours": 0.5
}
```

`reduction_percent` is 0–100. Setup/maintenance hours are 0–744. Other amounts
are 0–1000000 USD. All are finite numbers. Read adds `id`, `workflow_id`,
`analysis_id`, `updated_at` and `assumption_source` (`user_scenario` or
`illustrative_sample`). Proposed PUT result is
`{"scenario": <Scenario>, "roi": <ROI>, "priority_score": 0}`; its score is
computed by the future backend rather than fixed to this illustration.

For the sample workflow (10 baseline hours, USD 20/hour), the implemented Python
service returns the following. This is not a current HTTP endpoint result:

```json
{
  "baseline_monthly_hours": 10,
  "gross_hours_saved": 4,
  "production_and_review_hours_after": 6,
  "total_hours_after": 6.5,
  "gross_capacity_value": 80,
  "recurring_cost": 20,
  "net_monthly_value": 60,
  "initial_investment": 40,
  "first_month_value": 20,
  "payback_months": 0.6666666666666666,
  "net_hours_released": 3.5
}
```

Gross time savings exclude monthly upkeep; `total_hours_after` includes it.
Net monthly value deducts tools and maintenance labour once. Keep negative net
values and negative net hours; return null payback for nonpositive net value.
The backend is authoritative, and display rounding must not affect calculations.

## Measurement object and comparison

### History/measurement extension (v1.2)

These shapes were defined before route binding and are now implemented.
Route availability is listed in the table at the start of this document.

- `GET /workflows/{id}/baselines` returns `Page[WorkflowBaseline]`.
  Each item has `workflow_id` (UUID), `baseline_version` (positive integer),
  `snapshot` (the complete read-only Workflow object at that version) and
  `created_at` (UTC timestamp when that baseline was captured). Snapshot `id`
  equals `workflow_id`; snapshot version equals the item version. The original
  hourly cost, time, frequency, task facts and workspace ID remain unchanged.
  Snapshot timestamps belong to the original workflow; the enclosing timestamp
  belongs to the history record. Workspace currency is always USD.
- `POST /workflows/{id}/measurements` accepts the existing MeasurementInput
  below and returns the saved Measurement directly with HTTP 201.
- `GET /workflows/{id}/measurements` returns `Page[Measurement]`, including
  records for all historical versions. Join each record's `baseline_version`
  to the corresponding baseline snapshot before comparing results.

Both lists accept `limit=1..100` (default 50), and optional opaque `cursor`
(maximum 1024 chars). Both use `{"items": [...], "next_cursor": null}`;
null means the end. Baselines sort by ascending `baseline_version` and use a
version-position cursor. Measurements sort by ascending `(created_at, id)` and
use the existing timestamp/UUID keyset style. Cursors are bound to the route,
workflow and authenticated user; malformed or wrong-scope cursors return 422.
Changing page size is allowed. Pages are not a frozen snapshot during writes.

All routes verify ownership using the existing user-JWT/RLS access path. Missing
and foreign workflows return 404; absent requested baseline versions return 404.
An empty measurement list is valid and means not measured yet. Duplicate
`(workflow_id, baseline_version, period)` inserts return 409, including races.
Their public code remains `conflict`, with a fixed explanation and a
`body.period` detail whose code is `duplicate_measurement`; no record is replaced.
Input validation returns 422; Auth/database/configuration failures return the
existing 401/503 envelopes. A failed write's outcome may be unknown on network
failure; refetch before retrying blindly. No new update/delete measurement route
is supplied, and generated IDs/timestamps/owner/workflow fields are not writable.

`baseline_version` is an explicit selection, not an expected-current-version
check: retrospective measurements may deliberately reference any existing
baseline of the same workflow. A current-input edit during a measurement write
does not change that selection. A missing version is never replaced with the
latest baseline. History and measurements remain until explicit workflow deletion.

The ROI engine is a typed Python service; this phase adds no ROI, analysis or
scenario HTTP endpoint. These routes do not execute a classifier or AI.

Measurement POST input (fictional example):

```json
{
  "baseline_version": 1,
  "period": "2026-10",
  "production_and_review_hours_after": 6.5,
  "maintenance_hours_after": 0.5,
  "monthly_tools_and_fees": 10,
  "initial_implementation_cost": 40,
  "is_demo": true
}
```

Read adds `id`, `workflow_id` and UTC `created_at`. Hours are 0–744 and costs
0–1000000, all finite/nonnegative; period is a valid month in `YYYY-MM` form.
No stored measurement means **Not measured yet**, not zero hours or savings.

Production/review excludes upkeep. Tools/fees exclude upkeep labour. Initial
cost is one inclusive total of setup labour plus fees. Net time released is
baseline minus production/review and upkeep; net value is that time times hourly
cost, minus tools/fees. This example gives 3 hours, USD 50/month and USD 10 first
month. Compare total scenario hours (6.5) against total reported hours (7).
Label `is_demo=true` as hypothetical; other entered outcomes are self-reported,
not independently verified.

The database foreign key binds each measurement to `(workflow_id,
baseline_version)` in `workflow_baselines`. Editing the current workflow never
rewrites that snapshot or historical measurements. A later comparison must load
the matching snapshot, including its original hourly cost. Never calculate an
old result from today's baseline. Explicit workflow deletion removes its history.
The implemented Gainvera routes use that same RLS-protected access with the
authenticated user's token. The ROI service can construct its typed input from
an original WorkflowBaseline snapshot and rejects scenario/baseline version
mismatches. See [Python usage and edge cases](ROI_SERVICE.md).

## Reviewed playbook reads

`GET /playbooks` returns `{"items": [...], "next_cursor": null}` for authenticated
users. Only `review_status="reviewed"` rows are visible. Ordinary users cannot
insert, update or delete playbooks, analyses, scenarios, audit events or baseline
snapshots. Analysis/scenario write permissions await the trusted analysis phase.

The reviewed object has: `id` and `version` (strings, 1–100; composite identity),
`task_family` (six-family enum), `title` (1–100), `conditions` (up to 3000),
`base_recommendation` (four-category enum), `difficulty` (integer 0–100),
`required_inputs`, `steps`, `risks` (string arrays), `example_template`,
`human_review`, `measurement_method` (strings), `provenance` (JSON object),
`review_status` (`reviewed`), `reviewed_by` (string), `reviewed_at` and `created_at`
(UTC timestamps). See the database guide (gainvera-backend: `server/supabase/README.md`) for seed
limits and review requirements. This stage seeds no playbooks or review claims.

The library is sorted by `(id, version)` and limited to 100 reviewed versions;
more than 100 returns 503 rather than silently truncating. No cursor/query
pagination is offered for this small library yet. An empty reviewed library is
valid and does not imply that guidance or the AI integration is ready.

## Frontend mapping from the current demo

| Current TypeScript field | Planned API field / handling |
| --- | --- |
| `Workflow.business` | `Workspace.name`; workflow references `workspace_id` |
| `hours`, `frequency`, `hourlyCost` | `hours_per_occurrence`, `occurrences_per_month`, `hourly_cost` |
| `tools`, `painPoints`, `data`, `sample` | `current_tools`, `pain_points`, `data_availability`, `is_sample` |
| `analyzed` | Derive from server `analysis_status`; not a writable boolean |
| `assumptions.reduction` | `reduction_percent` |
| `setupHours`, `setupCost` | `setup_hours`, `setup_fees` (fees only) |
| `monthlyTools`, `maintenanceHours` | `monthly_tool_fees`, `monthly_maintenance_hours` |
| `Analysis.category`, `score` | `recommendation`, `priority_score` |
| `Analysis.taskCategory`, `similarity` | No direct conversion to `task_family`/ML confidence; old text matching is different |
| `Outcome.hours`, `monthlyCost` | No automatic conversion: legacy combined upkeep/cost values must be split and re-entered explicitly |
| `Outcome.implementationCost`, `demo` | `initial_implementation_cost`, `is_demo`, after baseline and cost checks |

Member A should keep a dedicated adapter rather than renaming shared UI types
across the project without review. Do not upload browser records automatically.

## Next handoff

Member A can now bind Supabase login, workspace selection and workflow CRUD to
the implemented routes. The prepared client's PATCH/page/health additions are
now present; bind them using [the short handoff](MEMBER_A_BACKEND_HANDOFF.md).
Keep fixture use explicit for planned analysis/results; never fall back to
fixtures after an HTTP failure. Model artifacts and reviewed playbooks are
supplied by Member C, not generated by this phase.

The v1.2 extension also supplies baseline/history and measurement routes above.
A can reuse its Workflow type for each baseline `snapshot` and its existing
Measurement types for create/read. Add the two paginated read bindings explicitly;
the existing scenario, analysis, dashboard and report calls remain future work.

Implemented PATCH example, using a fictional workflow's current version:

```json
{
  "baseline_version": 1,
  "hours_per_occurrence": 0.5,
  "risk": "unknown"
}
```

Implemented workspace-list response shape (illustrative UUIDs/timestamp):

```json
{
  "items": [{
    "id": "c0ae0b3a-e90c-443b-bc7e-a6c4275b274a",
    "owner_id": "10000000-0000-4000-8000-000000000001",
    "name": "NovaCart",
    "currency": "USD",
    "created_at": "2026-10-20T01:00:00Z"
  }],
  "next_cursor": null
}
```

Baseline-history response (fictional saved workflow, first version):

```json
{
  "items": [{
    "workflow_id": "f1393f14-ee79-4eae-8e31-dff6743aeb38",
    "baseline_version": 1,
    "snapshot": {
      "workspace_id": "c0ae0b3a-e90c-443b-bc7e-a6c4275b274a",
      "name": "Product description drafting",
      "description": "Draft descriptions from approved facts and have a person review.",
      "hours_per_occurrence": 0.25,
      "occurrences_per_month": 40,
      "hourly_cost": 20,
      "current_tools": "Store product spreadsheet",
      "pain_points": "Repeated drafting",
      "risk": "medium",
      "data_availability": "digital",
      "is_sample": true,
      "id": "f1393f14-ee79-4eae-8e31-dff6743aeb38",
      "baseline_version": 1,
      "analysis_status": "not_analyzed",
      "created_at": "2026-10-21T06:00:00Z",
      "updated_at": "2026-10-21T06:00:00Z"
    },
    "created_at": "2026-10-21T06:00:00Z"
  }],
  "next_cursor": null
}
```

Measurement-list response (fictional, hypothetical result at original version 1):

```json
{
  "items": [{
    "id": "41111d0b-bafd-4c66-8f08-49dd91467b7e",
    "workflow_id": "f1393f14-ee79-4eae-8e31-dff6743aeb38",
    "baseline_version": 1,
    "period": "2026-10",
    "production_and_review_hours_after": 6.5,
    "maintenance_hours_after": 0.5,
    "monthly_tools_and_fees": 10,
    "initial_implementation_cost": 40,
    "is_demo": true,
    "created_at": "2026-10-21T06:05:00Z"
  }],
  "next_cursor": null
}
```
