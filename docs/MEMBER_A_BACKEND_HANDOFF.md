# Member A backend handoff — API v2.0

> Snapshot of B's incoming assignment, preserved as source evidence.
> A has now implemented it. [Current handoff to B](MVP_HANDOFF.md) records
> the next assignment; [API source](API_SOURCE.md) identifies this snapshot.

28 October 2026. **A is next.** B's result backend is ready for frontend
integration using the user-selected **reviewed-playbook fallback**. Whole-MVP
acceptance still requires your real browser/API checks. Do not start C's work.
Read [MVP handoff](MVP_HANDOFF.md), [API contract](api-contract.md) and
[result state/field reference](RESULTS_API_V2.md). Existing storage routes and
wire field names are preserved. No frontend code was changed by B.

## Authenticate and call

Continue using the existing Supabase Auth session. Supply its current
**access_token** on every call: `Authorization: Bearer <access_token>`.
The SDK renews sessions; after a 401 refresh/re-authenticate. Never send the
refresh token, user-supplied owner ID, DB URI or private server signing/API keys.
The backend validates Auth online and uses that same user JWT for persistence.

API: `http://127.0.0.1:8000`. Allowed frontend origins: localhost/127.0.0.1 on
3100. CORS allows PUT as well as existing verbs, JSON/bearer headers and exposes
X-Request-ID. No cookie credentials. API process is left running at verification
time; identify the port listener before starting another instance.

## Your exact next assignment

1. Update companion frontend v2 wire types/client/adapters. Analysis and scenario
   now return **state envelopes**, not bare objects. Add scenario GET restoration.
   Bind real results only in account mode; preserve agency/local fixture views.
2. Keep workflow intake/storage working. After saving facts, POST
   `/workflows/{id}/analyze` with its current `baseline_version` and preferably
   `guidance_preference: "reviewed_playbook"` for this selected MVP mode.
   GET `/workflows/{id}/analysis` restores it after reload.
3. Handle analysis states explicitly: not_analyzed, ready, needs_clarification,
   needs_reanalysis. Show missing information, safety reasons, reviewed conditions,
   required inputs, human review, model/playbook/rules versions and fallback label.
   Recognized family/confidence does not mean safe automation or guaranteed value.
   Workflow analysis_status=analyzed can include clarification; use the state envelope.
4. Let the user enter all ROI assumptions; no guessed reductions. PUT
   `/workflows/{id}/scenario` with current analysis_id/baseline plus all six
   assumption fields and **expected_updated_at**. Null means first save for that
   analysis; on edits send the exact saved timestamp. GET scenario restores the
   result and authoritative ROI. Preserve negatives and null payback; round only
   for display. Rerunning analysis makes prior scenarios stale, even on the same
   baseline. If restored scenario.analysis_id differs from the current analysis,
   a new scenario save uses null, not the old analysis's saved timestamp.
5. Bind paginated GET baselines, POST measurement and paginated GET measurements.
   Always select the exact baseline version deliberately. Show original time/cost;
   historical records must not be recalculated from today's workflow. Duplicate
   workflow/version/month is 409, missing baseline 404. Mark is_demo as hypothetical;
   other outcomes are self-reported, unverified. No measurement edit/delete exists.
6. Use GET `/dashboard?workspace_id=<uuid>` for complete totals/ranking. Its fields
   are specified in RESULTS_API_V2.md. Null estimates mean unestimated. Coverage
   identifies excluded stale/clarification results. Do not sum only the visible
   workflow page, combine measurement periods or treat capacity value as cash.
7. Download GET `/reports/{workspace_id}` with the bearer header using fetch/blob.
   An unauthenticated anchor cannot attach the token. Use the server attachment
   filename or a safe fixed filename. Never put the token in a URL.
8. Verify two actual accounts in the browser: save/analyze/reload/restore scenario,
   edit ROI, change baseline and reanalyze, select an old baseline for a result,
   see correct complete dashboard/report, and confirm B cannot access A's IDs.
   Check sign-out/account switch clears all selected state and preserve the demo.
   Test 409 reconciliation, 401 and dependency failure states without fixtures.

All business failures use the existing error envelope + request ID. 401 means
sign in; 404 means missing/inaccessible; 409 means refetch/reconcile; 422 means
fix fields; 503 means show service unavailable. Never silently substitute local
fixtures after an HTTP error. A timeout after POST/PUT may have saved data:
refetch before retrying. Repeated analyze is not idempotent.

## Ready inputs, remaining limits

C's classifier and six exact reviewed v1.0.0 playbooks are integrated. No C change
is needed for this handoff. B verified real Auth/RLS/native signed persistence,
concurrent edits, original-baseline calculations and standalone HTTP. Provider
branches were tested with explicit mocks; **no real OpenAI call was made**.
Missing provider credentials use labelled reviewed guidance. Health reports all
four dependencies not_checked/checked=false; it is never an external readiness
indicator. Browser integration, deployment and real-store validation are not
claimed. Return your updated context/log/verification and precise handoff to B
for final combined acceptance after finishing the frontend.
