# Frontend API boundary

The real account flow uses B's [API v2 reference](../../../../docs/api-contract.md)
and [result envelopes](../../../../docs/RESULTS_API_V2.md). See
[source revision and hashes](../../../../docs/API_SOURCE.md). Agency UI types,
LocalStorage and calculations are unchanged. Explicit in-memory fixtures remain
separate and never replace a failed HTTP request.

- `types.ts`: snake_case inputs and read records, pages, state envelopes,
  reviewed playbook provenance, complete dashboard and report Blob metadata.
- `validation.ts`: request whitelists and finite numeric, string, enum,
  version and YYYY-MM limits. Server IDs, owners, timestamps and calculated
  scores/ROI are omitted from creates. Scenario CAS is a deliberate input.
- `adapter.ts`: explicit conversions preserving unknown facts, nulls, status
  and versions. `scenarioEditContext` scopes the concurrency timestamp to the
  matching current analysis, not simply the workflow/version.
- `results-decoder.ts`: checks result envelopes and fields used for display,
  association and concurrency. Returns original objects, preserving raw timestamps,
  negatives, null payback/provenance and additional provenance JSON. This is not
  a complete runtime validator of every storage domain record.
- `client.ts`: current-token supplier, confined API origin, no redirects/cookies,
  safe structured errors and request IDs. HTTP methods never replay writes.
- `fixtures.ts`: separately constructed read-only development source. Its bare
  analysis reference is a labelled example, not the HTTP AnalysisState envelope.
  `GainveraReadSource<T>` makes the distinction explicit. Fixture absence throws.

`createGainveraHttpClient({baseUrl, getAccessToken})` binds health; paginated
workspaces/workflows; create/read/PATCH/204 delete; analyze/read analysis;
save/read scenario; paginated baselines/measurements; measurement create;
complete dashboard; authenticated HTML report. Results include `{body,status,
requestId}` client metadata; HTTP JSON has the contract shape without a new wrapper.

Analyze sends current `baseline_version` and `reviewed_playbook` preference from
the account controller. Read state envelopes even when workflow status says
analyzed. Scenario saves require `analysis_id`, `baseline_version` and the required
nullable `expected_updated_at`. First save **per analysis** sends null; edits use
the exact returned string. Never round-trip it through Date. Same-baseline reruns
invalidate old scenarios. Backend ROI/priority is authoritative; real account
code imports no fixture/local ROI engine.

`requestReport` obtains a bearer token normally, requires nonempty HTML, returns
a Blob and sanitized attachment filename (safe fallback if CORS hides it).
The view downloads the Blob only after account/workspace/workflow guards pass.
Tokens are never in URLs or logs; HTML is not executed in the application.

`../account/results-store.ts` composes the existing guarded AccountStore transport.
Aborts and generation/view checks reject late data and late errors, including old
401s. A current 401 clears protected state and requires sign-in. Network/protocol/
5xx/conflict writes require an explicit outcome read before another attempt;
analysis reruns are non-idempotent. Scenario drafts survive reconciliation.
Duplicate measurement detail `body.period: duplicate_measurement` is distinct
from baseline/scenario conflicts. Reconciliation reads every measurement page
before permitting a retry; it never overwrites a duplicate record.

No automatic agency combined-outcome migration exists. No service keys belong
in frontend variables. Public setup, test commands and actual evidence are in
[frontend setup](../../../README.md) and [verification](../../../../VERIFICATION.md).
