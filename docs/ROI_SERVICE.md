# Backend ROI service

Implemented 21 October 2026. This is a deterministic Python service, not an
HTTP route, model prediction or guarantee of cash savings. It makes no network
or database calls and invents no reduction/setup/tool assumptions.

## Typed usage

From `server/`, the module is `app.services.roi`:

```python
from app.contracts.domain import ScenarioInput, WorkflowBaseline
from app.services.roi import ROIBaseline, calculate_roi

# original is a validated saved WorkflowBaseline from the selected version.
def evaluate(original: WorkflowBaseline):
    baseline = ROIBaseline.from_history(original)
    assumptions = ScenarioInput(
        baseline_version=original.baseline_version,
        reduction_percent=40, setup_hours=2, setup_fees=0,
        monthly_tool_fees=10, monthly_maintenance_hours=0.5,
    )
    return calculate_roi(baseline, assumptions)
```

The numbers above are illustrative supplied assumptions, not defaults in the
engine. `ROIBaseline` contains `baseline_version`, `hours_per_occurrence`,
`occurrences_per_month`, `hourly_cost`. It has the same strict finite numeric
limits as workflow intake. ScenarioInput retains the API's existing fields,
units and bounds. Construct validated models before calling the service.
Mismatched versions raise ValueError; invalid models raise ValidationError.
Derived values that cannot be represented as finite numbers are also rejected.

## Calculation contract

```text
baseline_monthly_hours = hours_per_occurrence * occurrences_per_month
gross_hours_saved = baseline_monthly_hours * reduction_percent / 100
production_and_review_hours_after = baseline_monthly_hours - gross_hours_saved
total_hours_after = production_and_review_hours_after + monthly_maintenance_hours
gross_capacity_value = gross_hours_saved * hourly_cost
recurring_cost = monthly_tool_fees + monthly_maintenance_hours * hourly_cost
net_monthly_value = gross_capacity_value - recurring_cost
initial_investment = setup_fees + setup_hours * hourly_cost
first_month_value = net_monthly_value - initial_investment
payback_months = initial_investment / net_monthly_value, only when net > 0
net_hours_released = gross_hours_saved - monthly_maintenance_hours
```

Return type is the shared ROI model. Negative net values/time remain negative;
payback is null for zero/negative ongoing net value. Positive net with zero setup
investment gives zero payback. Nothing is rounded in the service; display
rounding belongs to the UI. Review/correction effort belongs in the supplied
production reduction; upkeep and fees are each deducted once.

The documented 10 hours/month at $20/hour, 40% reduction, 2 setup hours, $0 setup
fees, $10 monthly tools and 0.5 upkeep hours gives $60 ongoing net, $40 initial,
$20 first month, 3.5 net hours released, and 2/3 month payback.

## History and reported results

Measurements are self-reported (or explicitly hypothetical when `is_demo=true`).
No measurement means not measured yet. Fetch `GET /workflows/{id}/baselines` and
match both workflow and version to `GET /workflows/{id}/measurements` before
comparison. Do not build ROIBaseline from today's workflow when evaluating an
old scenario. Cost/time edits do not rewrite immutable historical snapshots.

Measurement production/review excludes maintenance. Tools/fees exclude upkeep
labour; initial_implementation_cost is one inclusive setup total. Actual net
hours are original baseline hours minus reported production/review and upkeep;
actual net value is those hours times original hourly cost minus reported fees.
The measurement APIs return facts, not a derived comparison envelope in this
phase. Analysis/scenario HTTP execution and priority scoring remain planned.

Tests: `server/tests/test_roi.py`, `test_history.py`, and the real hosted tests
in `test_live_supabase.py`. See actual checks (gainvera-backend: `server/VERIFICATION.md`).
