# Results API v2.0

> Reference snapshot from B's local backend; [source revision/hashes](API_SOURCE.md).
> See [A's current handoff](MVP_HANDOFF.md) for completed frontend integration.

27 October 2026. Additive to working storage/history/measurement APIs. These
contracts defined the result flow before route binding and are now implemented.
Bearer access tokens, request IDs, error envelope, USD, decimal hours, finite
inputs and ownership behavior remain as in api-contract.md.

## Operations and normal states

- POST `/workflows/{id}/analyze`: input `baseline_version` (required positive
  integer), `guidance_preference` (`auto`, default, or `reviewed_playbook`).
  Returns AnalysisState, HTTP 200 after atomic persistence. A stale expected
  baseline is 409. Classifier unavailable is 503, with no fabricated analysis.
- GET `/workflows/{id}/analysis`: AnalysisState with `state`,
  `current_baseline_version`, nullable `analysis` and nullable exact-version
  reviewed `playbook`. States: `not_analyzed` (analysis null), `ready`,
  `needs_clarification`, `needs_reanalysis` (old analysis explicitly stale).
  All normal states return 200. Missing/foreign workflow returns 404.
- PUT `/workflows/{id}/scenario`: ScenarioInput plus required `analysis_id`
  and required nullable `expected_updated_at`. Use null only for the first
  save; use the returned timestamp on edits. Returns ScenarioState with
  saved `scenario`, authoritative `roi`, `priority_score`, current baseline
  and `state=ready`. Concurrent baseline/analysis/scenario edits return 409.
  Clarification must be resolved before saving a scenario.
- GET `/workflows/{id}/scenario`: same ScenarioState shape. `not_set` has null
  scenario/ROI/score; `ready` is current; `needs_reanalysis` retains explicitly
  stale data calculated from its original baseline. Optional `baseline_version`
  selects a historical version deliberately, giving `historical` when it differs
  from current. Unknown baseline is 404. No silent rebasing or invented defaults.
- GET `/dashboard?workspace_id={uuid}`: complete Dashboard, not a paginated
  subset. Includes workspace, generated_at, coverage, scenario_totals,
  ranked_workflows, individual version/period-labelled measurements and notes.
- GET `/reports/{workspace_id}`: authenticated UTF-8 HTML attachment, escaped
  user content, original baselines/scenarios, current/stale labels, provenance
  and individual measurements. CSP blocks scripts, forms and external resources.

Analysis retains existing fields and adds rules_version, ml_reason,
guidance_reason and safety_reasons. AI modes remain `ai_assisted`,
`reviewed_playbook_fallback`, `needs_clarification`. Actual provider_model and
prompt_version are populated only after valid live selection. Fallback reasons
include provider_not_configured, provider_unavailable, provider_invalid_output,
provider_refused, privacy_guard, static_requested, rule_guard and
clarification_required. Model states remain
recognized/abstained/unavailable; model confidence is not safety or savings.

## Persistence, concurrent edits and direct database protection

Ordinary authenticated users still have no analysis/scenario INSERT/UPDATE
grants. Backend computed writes carry short-lived HMAC-SHA256 authorization
bound to operation, user, workflow, baseline and a single-use nonce. The secret
is provisioned separately in the ignored server .env and private DB table.
Client requests cannot submit result/provenance fields or obtain that secret.
The RPC uses the same user JWT, checks ownership, locks the workflow and checks
versions atomically. Scenario commits additionally match the current analysis
head and expected saved timestamp. Signed payloads are not browser API inputs.
Expected conflicts use SQLSTATE `PT409`, not `40001`. Hosted testing exposed
PostgREST retrying the latter. The follow-up migration preserves the applied
initial migration and returns conflicts promptly, following
[Supabase's official troubleshooting guidance](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions).

All current/history reads come from one owner-checked SQL snapshot. The scalar
JSON result avoids PostgREST's row-count cap; current totals cover all relevant
workflows. Current scenario totals exclude stale, absent and clarification
results. Empty scenario coverage gives null values, not zero savings. Shared
fees must be allocated once by the user; the server cannot infer duplication.
Measurements retain original baseline costs. They remain individual periods and
versions, with hypothetical/self_reported labels; no mixed-period sum is shown.

## Rules and grounding

Rules version ecommerce-rules-v1 preserves unknown risk/data and asks for their
clarification. Refund/high-risk/sensitive decisions retain human authority.
Compound-output checks supplement the classifier's documented ambiguity weakness.
Under two hours per month gives LEAVE ALONE; automation requires confirmed low
risk/digital inputs and the reviewed playbook's conditional base category.
Difficulty uses C's higher=harder scale; ease=100-difficulty. Priority uses
35% value, 30% feasibility, 15% readiness and 20% safety, with zero for LEAVE
ALONE. Value is zero/provisional until a user scenario supplies net value.
ML/AI never set reductions, scores or final authority.
Feasibility is round-half-up of `0.65*(100-difficulty) + 0.35*min(100,frequency*8)`.
Value is `min(100,max(0,net_monthly_value)/5)` after a saved scenario, otherwise
zero. Readiness is digital=100/manual=35/unknown=20. Safety is
low=100/medium=55/high=0/unknown=30; refund safety is zero. Weighted score is
rounded half up; LEAVE ALONE always scores zero. These are versioned project
heuristics, not learned business evidence. Unknown risk/data requires clarification.
When a rule overrides an operational playbook to LEAVE ALONE, its operational
steps are suppressed (`guidance_reason=rule_guard`); the reviewed refund playbook
itself retains its human-only steps. At most two model jobs run in workers per
process; a five-second slot wait returns 503. C's loader remains unchanged.

Live AI performs extractive selection from the exact reviewed playbook. The
Responses API returns validated step indices; displayed text remains verbatim,
original order is retained, and safety/review/stop/pilot steps cannot be omitted.
No free-form generated operational claim is displayed. Missing credentials or
provider errors use explicitly labelled reviewed static steps. Human review,
conditions, risks and provenance remain visible. No live store action occurs.
The integration follows the official
[Responses structured-output format](https://developers.openai.com/api/docs/guides/structured-outputs).
Its strict schema accepts only ordered integer step indices, never operational
text. Obvious email/credential/card-number patterns prevent a provider call;
this is a precaution, not a general personal-data detector. Users must describe
processes without customer data. The current user selected fallback; real
provider connectivity has not been tested.

## Read fields and units

All IDs are UUID strings except versioned playbook/model/rules IDs. All timestamps
are timezone-aware ISO 8601; preserve full timestamp precision for scenario CAS.
All hours are decimal hours, all currency is USD, and no output is display-rounded.
All request objects forbid extra fields. ScenarioSaveInput requires all six
ScenarioInput fields plus analysis_id and expected_updated_at; no assumptions
are inferred from the classifier/playbook.

| Object | Exact fields |
| --- | --- |
| AnalysisState | state, current_baseline_version, analysis (Analysis or null), playbook (ReviewedPlaybook or null) |
| ScenarioState | state, current_baseline_version, scenario (Scenario or null), roi (ROI or null), priority_score (integer or null) |
| Dashboard | workspace, generated_at, coverage, scenario_totals, ranked_workflows, measurements, notes |
| coverage | ready, not_analyzed, needs_clarification, needs_reanalysis, total_workflows, current_scenarios, measurement_records; all integer counts |
| scenario_totals | baseline_monthly_hours, gross_hours_saved, net_hours_released, net_monthly_value, initial_investment, first_month_value (number or null); covered_workflows (integer); all_workflow_monthly_hours (number) |
| ranked_workflows item | workflow, analysis_state, scenario_state |
| measurements item | measurement, original_baseline, net_hours_released, net_monthly_value, first_month_value, provenance (hypothetical or self_reported) |

Analyses and scenarios preserve the full domain fields in api-contract.md.
Coverage's first four counts partition all workflows. Ranked entries with current
ready analyses sort by descending priority, then creation time/UUID; remaining
states sort at priority zero. Scenario totals include only ready current saved
scenarios, each once; all_workflow_monthly_hours covers every current workflow.
No current scenarios means six nullable totals are null. Scenario initial/first
month totals assume starting those selected projects together, not historical
cash flow. Measurements are not summed across periods or baseline versions.
`rules_version` and optional `ml_reason`, `guidance_reason`, `safety_reasons`
extend Analysis. Unknown classifier status is not silently converted to a family.
Provider and prompt metadata remain null in every fallback/clarification result.

## Example requests

```json
{"baseline_version":1,"guidance_preference":"auto"}
```

```json
{
  "baseline_version":1,
  "analysis_id":"98122d0b-bafd-4c66-8f08-49dd91467b7e",
  "expected_updated_at":null,
  "reduction_percent":40,
  "setup_hours":2,
  "setup_fees":0,
  "monthly_tool_fees":10,
  "monthly_maintenance_hours":0.5
}
```

The IDs/assumptions are illustrative; fetch the real current analysis first.
Example GET analysis response before any run (HTTP 200):

```json
{
  "state": "not_analyzed",
  "current_baseline_version": 1,
  "analysis": null,
  "playbook": null
}
```

Example GET scenario response before any save (HTTP 200):

```json
{
  "state": "not_set",
  "current_baseline_version": 1,
  "scenario": null,
  "roi": null,
  "priority_score": null
}
```

On 409, refetch and reconcile; do not replay a stale PUT blindly. Existing
401/404/422/503 behavior is preserved. Provider failures cannot become a fake
live-AI mode or an empty successful database result. Failures use the existing
`error` envelope and request ID; they are not normal state objects. A failed
rerun preserves the previous saved result; refresh to see it. For timeouts after
a write, outcome may be unknown: refetch before retrying. POST analyze is not
idempotent; every accepted run creates a new analysis head and makes prior
scenarios stale, including reruns on the same baseline. First-save null applies
per analysis, not per workflow. GET historical selection returns the latest saved
scenario at that baseline; all versions/analyses are preserved in report history.
Full setup, actual checks and remaining limits are in [MVP handoff](MVP_HANDOFF.md).
