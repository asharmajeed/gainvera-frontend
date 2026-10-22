# Frontend API foundation

This module prepares Member A's e-commerce frontend against the
[v1.1 API contract](../../../../docs/api-contract.md) and
Pydantic types (gainvera-backend: `server/app/contracts/domain.py`). It is not imported
by the current agency demo. Its components do not read LocalStorage, upload
browser records, sign in, run a classifier or calculate recommendations/ROI.
The separate `/ecommerce` preview uses these adapters and fixture workspace data
with `../ecommerce/preview.ts` for in-memory edits and baseline history.
The separate `../ecommerce/results.ts` computes explicitly labelled local scenario
arithmetic from agreed inputs, keeps original measurement baselines and derives
local overview fields. Its view models and fixture HTML report are not API response
envelopes. Static `response-examples.ts` values never become actual analysis.

## Files and boundaries

- `types.ts`: separate snake_case API request/read types, with optional defaults
  in create inputs and required fields in read records. Nullable provenance stays
  nullable. PATCH, paginated workspace/workflow lists and expanded health status
  match v1.1. Dashboard and scenario response envelopes remain pending.
- `adapter.ts`: explicit conversion of form fields, workflow metadata, analysis,
  scenario assumptions and split measurements. Existing `../models.ts` is intact.
- `validation.ts`: request whitelists and finite numeric, enum, string, version
  and month validation. Errors contain field names and safe messages, not values.
- `client.ts`: configurable HTTP transport and a small set of prepared endpoint
  bindings. Persistence routes are implemented by B; planned analysis/results
  bindings still expose failures rather than returning fixtures.
- `fixtures.ts`: explicitly selected, labelled, read-only development snapshots.

The response types are compile-time contracts. The HTTP transport checks JSON
object framing and validates error envelopes; it does not implement complete
runtime decoding of every successful domain record. Real API integration must
verify responses against the shared contract.

## Explicit fixture reads

```ts
import { createDevelopmentFixtureSource, workflowFromApi } from "@/lib/api";

const source = createDevelopmentFixtureSource({ mode: "development_fixture" });
// Display source.label wherever the fixture source is used.
const snapshot = source.getSnapshot();
const result = await source.getWorkflow(snapshot.workflows[0].id);
const view = workflowFromApi(result.body);
```

The snapshots contain one fictional workspace, an unanalyzed workflow and a
separate unavailable/clarification analysis example. Unknown risk/data values
are preserved. There are no stored scenarios, measurements, savings claims or
trained predictions. An absent fixture analysis raises `FixtureDataError` with
`fixture_analysis_absent`; that is a local fixture state, not a decision about
the future API's not-analyzed HTTP response. Snapshots and reads are cloned.
Fixture results have null HTTP status/request ID and cannot perform mutations.

`GainveraReadSource` is the shared workflow/analysis read interface. HTTP and
fixture construction are separate; there is no automatic mode selection,
environment switch, request interception or error fallback.

## HTTP configuration

```ts
import { createGainveraHttpClient, type AccessTokenSupplier } from "@/lib/api";

function configureApi(getAccessToken: AccessTokenSupplier) {
  return createGainveraHttpClient({
    baseUrl: "http://127.0.0.1:8000",
    getAccessToken,
  });
}
```

The caller supplies a current access token from a future auth integration.
No token is hardcoded, stored or logged by this module. Token-provider, network
and response-read exceptions are replaced with safe errors without raw causes.
No environment variables or credentials are needed for fixture use or the
existing demo. Do not add service keys to frontend configuration.

`getHealth()` is public and skips token lookup. Its 200 proves only liveness.
The implemented persistence bindings require a token: `listWorkspaces`,
`createWorkspace`, `listWorkflows`, `createWorkflow`, `getWorkflow`,
`patchWorkflow`, `deleteWorkflow`. Lists accept limit 1–100 and opaque cursors
up to 1024 characters; retain page state per workspace/user. PATCH requires the
last-read version and non-null editable fields. `workflowToPatchRequest` omits
unchanged fields and returns null for no-op edits. Do not blindly retry a 409.
The prepared `getAnalysis` route remains unimplemented. B's v1.2 measurement
POST now exists; `createMeasurement` is still not bound to the account UI.
Delete confirmation belongs in the UI before calling `deleteWorkflow`.

Results are `{ body, status, requestId }` client metadata. The actual HTTP JSON
body is the contract object, without a `data` envelope. `requestJson` requires
a JSON object; empty/invalid JSON is a protocol error. `requestEmpty` requires
an empty 204 and is used for deletion.

Business requests obtain the token afresh, omit cookie credentials and disallow
redirects. Paths stay under the configured HTTP(S) base URL. Call options accept
an `AbortSignal` and optional UUID v4 `requestId`. The server returns its ID;
network errors retain a caller-supplied ID when available. HTTP errors expose
status, public code, field details, retryability and both header/body request IDs
when supplied. HTML or malformed errors never become an empty successful result.
`retryable` is a hint for the caller; requests are never automatically replayed.
After a network/read failure, the outcome of a write may be unknown.

## Pending A/B handoff

Independent results UI preparation is complete; see the
[frontend dependency handoff](../../../../docs/MEMBER_A_FRONTEND_HANDOFF.md).

- `/ecommerce/account` now binds Supabase sessions to working workspace/workflow
  routes through `../account/`. Public environment names and Node 22+ setup are
  in [frontend setup](../../../README.md). Two real browser owners were verified.
- Add v1.2 baseline-history/measurement list types and bindings in the separately
  assigned results integration; preserve original historical baseline costs.
- Dashboard response schema and future results integration verification.
- The response for a workflow that has not been analyzed yet.
- Final confirmation of the proposed scenario PUT result envelope before binding
  it. Scenario request/read and ROI body types are available independently.
- Actual backend analysis and C's classifier/playbook deliverables; the existing
  agency matcher cannot supply task-family predictions or ML confidence.

Legacy combined outcome hours/costs must be split and explicitly re-entered.
There is intentionally no `Outcome` to API measurement migration helper.

Run the normal lint, typecheck, tests and build commands from `frontend/`.
