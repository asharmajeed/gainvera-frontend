# Gainvera classifier integration contract for Member C

Draft v1.0, 19 October 2026. Member C owns data, reviewed playbooks, training,
evaluation and the classifier implementation. Member B owns HTTP endpoints,
authentication, risk/action rules, scoring and ROI. Member A owns the interface.

**Current status, 21 October 2026:** C supplied synthetic dataset v1, frozen
splits/challenges, six draft playbooks and the `ecommerce-family-v1.0.0` trained
pipeline, trusted loader and predictor. See [exact pins/load commands](MEMBER_C_ML_HANDOFF.md),
[actual evaluation](ml-evaluation.md), data (gainvera-backend: `data/README.md`) and the
unchecked review packet (gainvera-backend: `data/PLAYBOOK_REVIEW.md`). No reviewed playbook or
API integration is supplied. `/health` still reports ML as `not_implemented`;
C did not change B's health/startup configuration or active environment.

Executable request/response types:
`server/app/contracts/ml.py` (`MLInput`, `MLPrediction`). Shared family enum:
`server/app/contracts/domain.py` (`TaskFamily`). Changes require A/B/C review.

## Boundary and interface

These supplied paths belong to Member C:

```text
server/app/ml/__init__.py
server/app/ml/predictor.py
server/app/ml/artifacts/<model_version>/workflow_classifier.joblib
server/app/ml/artifacts/<model_version>/manifest.json
data/workflows.csv
data/playbooks.json
docs/ml-evaluation.md
```

The implemented predictor interface is:

```python
from app.contracts.ml import MLInput, MLPrediction

class WorkflowClassifier:
    def predict(self, request: MLInput) -> MLPrediction:
        ...
```

`app.ml.predictor.WorkflowClassifier()` loads the allowlisted default release;
its public input/output signature implements this contract. Member B will wire
its configuration/lifecycle into FastAPI after isolated compatibility checks.
Loading and inference are synchronous CPU/file work; the future async route
must execute them appropriately rather than block the event loop.

Train and infer on the **description only**. B supplies
`MLInput(description=workflow.description)` after standard request validation
(trimmed, 8–3000 characters). The classifier's preprocessing belongs inside the
saved pipeline, so train/inference tokenization cannot drift. Do not silently
concatenate titles, pain points, labels or owner IDs into the feature input.
Risk rules can inspect all relevant user facts separately; those are not ML
training features under this agreed description-only design.

```json
{
  "description": "Draft clothing descriptions from approved material, size and care facts. A person checks every claim before publishing."
}
```

## Exactly six task families

| ID | Meaning |
| --- | --- |
| `catalog_copy` | Product-description drafting from confirmed facts |
| `support_reply` | Customer-support reply drafting from approved policies |
| `stock_alert` | Internal stock alerts following stable thresholds |
| `catalog_cleanup` | Deterministic catalog/spreadsheet cleanup |
| `order_report` | Recurring order/sales report preparation |
| `refund_approval` | Human judgment about refunds/disputes |

These are task labels, not the four action categories. Predicting `stock_alert`
does not itself authorize automation. The backend must still establish low
risk, confirmed digital inputs and suitable rules. The classifier must not
return a final recommendation, ROI, savings percentage, priority or approval.

## Recognized output

Illustrative shape only; the number is **not** an actual model result:

```json
{
  "schema_version": "1.0",
  "status": "recognized",
  "task_family": "catalog_copy",
  "confidence": 0.72,
  "model_version": "example-v1",
  "reason": null
}
```

`confidence` is a finite number from 0 to 1 for the accepted predicted family.
Use the pipeline's actual class ordering when looking up probabilities. Do not
multiply by 100 for this API. It is not a calibrated probability of business
success, action safety or savings. Even strong family confidence cannot override
backend risk checks.

## Abstention and unavailable outputs

Abstention means the classifier ran but could not accept a supported family:

```json
{
  "schema_version": "1.0",
  "status": "abstained",
  "task_family": null,
  "confidence": 0.41,
  "model_version": "example-v1",
  "reason": "low_confidence"
}
```

For abstention, `confidence` may be the actual highest class score or null if no
meaningful score exists (such as zero known vocabulary). `task_family` stays
null. Reasons: `low_confidence`, `out_of_vocabulary`, `unsupported_task`,
`ambiguous_task`. Choose and document validation-based thresholds rather than
assuming an arbitrary cutoff is evidence of reliable unknown-task detection.
A forced-choice model can assign high confidence to unrelated text; combine
vocabulary/known-task checks, evaluation and backend clarification safeguards.

An unavailable predictor must not invent confidence or silently substitute a
different algorithm:

```json
{
  "schema_version": "1.0",
  "status": "unavailable",
  "task_family": null,
  "confidence": null,
  "model_version": null,
  "reason": "artifact_missing"
}
```

Unavailable reasons: `artifact_missing`, `invalid_artifact`,
`incompatible_artifact`, `inference_failed`. An artifact's version may be retained
only if its manifest is valid and known; otherwise null. Do not place filesystem
paths, exception text or package internals in user-facing error fields.

The planned backend maps abstention to a clarification response with no invented
reduction. For an unavailable model, it must either return a safe 503 or an
explicitly labelled reviewed-playbook fallback when separately justified. A
missing artifact is not evidence that a particular workflow is unsuitable.
Never expose a zero confidence as though a prediction was actually made.

## Artifact and manifest requirements

Supply a fitted scikit-learn Pipeline containing the TF-IDF vectorizer and
classifier together. Do not fit a new vectorizer when the server starts.

The manifest must include:

| Field | Requirement |
| --- | --- |
| `schema_version` | `1.0` for this integration contract |
| `model_version` | Immutable version identifying the pipeline and thresholds |
| `artifact_filename` | `workflow_classifier.joblib`; relative basename, not arbitrary user path |
| `artifact_sha256` | SHA-256 of the exact shipped pipeline |
| `python_version` | Exact training interpreter; this service targets Python 3.12 |
| `scikit_learn_version`, `numpy_version`, `scipy_version`, `joblib_version` | Exact serialization/inference dependency versions |
| `classes` | Actual pipeline class order; set must equal all six agreed IDs |
| `input_field`, `preprocessing` | `description`; versioned text normalization and TF-IDF settings |
| `confidence_threshold` | Validation-selected minimum, a number from 0 to 1 |
| `vocabulary_checks` | Chosen unsupported/zero-vocabulary behaviour and any validated thresholds |
| `dataset_version`, `dataset_sha256`, `split_manifest_sha256` | Provenance of labels and group-separated evaluation split |
| `trained_at` | UTC timestamp with offset |
| `evaluation` | Actual sample counts, metrics and reference to the evaluation report |
| `data_provenance` | Explicit synthetic/review status and limitations |

The model loader must verify the trusted manifest, hash, versions, expected
classes and pipeline structure before using the artifact. Loading an unknown
joblib/pickle file can execute code: only load a trusted project artifact, never
an HTTP upload, arbitrary URL or user-selected path. A checksum detects drift;
it does not make an untrusted artifact safe.

Do not automatically retrain, download a replacement or alter classifications
when loading fails. Return an unavailable state. Model-loading configuration is
planned for a later phase; `MODEL_PATH` is not a supported foundation setting yet.

## Dataset and evaluation handoff

C's `synthetic-workflows-v1.0.0` release supplies 180 synthetic descriptions:
six families, ten situation groups per family and three paraphrases per group.
The fixed per-family split is six whole groups for training, two for validation
and two for final testing, giving 108/36/36 rows overall. The versioned split
manifest is `data/splits/synthetic-workflows-v1.0.0.json`; validation and held-out
challenge files are separate, thirty rows each. All data/annotations are
AI-authored and not human-reviewed. Model metrics are supplied separately in
[the evaluation](ml-evaluation.md), not as evidence of dataset review.
Read the schema, labelling and held-out protocol (gainvera-backend: `data/README.md`) before use.
The model manifest must bind the exact dataset and split-manifest hashes.

Zero-vocabulary candidates are checked only against training text under a
documented reference word tokenizer. The shipped word pipeline also produced
zero fitted features for all six validation and six test OOV challenges and
abstained with null confidence. Data-integrity tests alone are not model evaluation.

Fit all feature extraction on training data only. Keep paraphrases of one
situation in the same split. Select settings/thresholds using validation data;
do not tune on the final test set. Also supply separate unknown, ambiguity,
high-risk and adversarial descriptions. Report actual accuracy, macro F1,
per-family precision/recall, confusion matrix, abstention counts and test sizes.
Keep predicted-class confidence separate from the business priority score.

Supply tests for all three result states, exactly six class labels, deterministic
loading and examples, zero-vocabulary input, malformed/missing artifacts,
incompatible versions and confidence bounds. The service must not claim to
predict real reductions or verified savings from synthetic task labels.

## Reviewed playbook handoff

Member C also supplies reviewed guides, separately versioned from the model:
ID, family, version, conditions, base recommendation, difficulty, required
inputs, ordered steps, example prompt/template, human review, risks and a
measurement method. Include reviewer status and provenance. Member B must not
pass unreviewed content to the AI as approved guidance or fabricate a review.
Suggested tool names are not claims of live integration or current tool prices.

Draft update, 21 October 2026: `data/playbooks.json` contains one local draft per
family at `0.1.0-draft.1`, with null review metadata and no invented `created_at`.
The review checklist (gainvera-backend: `data/PLAYBOOK_REVIEW.md`) is unchecked; no actual human
review, import or approved AI usage is claimed. Local draft validation mirrors
database limits without relaxing the reviewed API type. Base categories and
difficulty are unvalidated proposals; B retains final action/scoring decisions
and must confirm difficulty interpretation before integration. Do not use drafts
as approved grounding or a reviewed fallback.

Persistence update, 20 October 2026: the reviewed-playbook table and authenticated
read-only `GET /playbooks` now exist; no content was seeded. For column names,
review metadata, limits and separate administrative imports, read
the database handoff (gainvera-backend: `server/supabase/README.md`). This does not change the
classifier's input, output, artifact or evaluation contract.

## What Member B will add later

Token/ownership verification and workflow storage are implemented; see the
[API contract](api-contract.md). Remaining work is a bounded classifier call,
strict output validation, playbook selection, safety overrides, AI generation/fallback,
deterministic score/ROI calculations and saved versioned results. A successful
classifier unit test alone does not establish that those stages are available.
