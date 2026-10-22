# Member C model handoff to B

21 October 2026 (Asia/Karachi). **Supplied locally; not integrated into FastAPI.**
Model `ecommerce-family-v1.0.0` predicts the six-family enum using descriptions
only. Its held-out predictor recognized 32/36 ordinary cases correctly and
rejected four; it incorrectly accepted four of six ambiguous challenge cases.
Read [the full evaluation](ml-evaluation.md) before integration. Recognition and
confidence do not establish action safety, business value or savings.

## Files to share together

- Entire `server/app/ml/` package, including `preprocessing.py`, `decision.py`,
  `artifact.py`, `predictor.py`, the offline training module and trust allowlist.
- All five files in `server/app/ml/artifacts/ecommerce-family-v1.0.0/`: fitted
  `workflow_classifier.joblib`, `manifest.json`, `freeze.json`, `selection.json`
  and `evaluation.json`.
- `data/ml-requirements.txt`, `data/ml-selection-plan.json`, training entry point,
  C tests and the unchanged synthetic release/split metadata for reproduction.
- Evaluation, verification, context and changelog with the code. `.venv-ml/`, pip
  caches and scratch files are local installations, not portable deliverables.

The model's custom normalizer uses the stable import path
`app.ml.preprocessing.DescriptionNormalizer`; copying only the joblib file is
insufficient. Preserve LF source/JSON bytes and binary artifact bytes; the local
Git attributes prevent newline conversion from breaking the recorded hashes.

## Isolated installation

The tested C environment is `data/.venv-ml` with **Python 3.12.14**. Serialization
dependencies are exactly scikit-learn **1.7.2**, NumPy **2.2.6**, SciPy **1.15.3**,
joblib **1.5.2** and threadpoolctl **3.6.0**. Runtime loading checks these plus the
exact Python patch version and C runtime source hashes before deserialization.
The complete C-owned requirements additionally pin Pydantic 2.12.5 and Ruff
0.14.1 with their transitive dependencies. See the exact file (gainvera-backend: `data/ml-requirements.txt`).

From a fresh project copy in PowerShell, use an accessible Python 3.12.14
executable to create a new C environment; `py -3.12` below is a placeholder for
that installed interpreter, not permission to recreate an existing environment:

```powershell
Set-Location 'D:\Netsol\Gainvera'
New-Item -ItemType Directory -Path data/.scratch/ml-temp -Force | Out-Null
$env:TEMP = (Resolve-Path -LiteralPath data/.scratch/ml-temp).Path
$env:TMP = $env:TEMP
py -3.12 -m venv data/.venv-ml
.\data\.venv-ml\Scripts\python.exe -m pip install -r data/ml-requirements.txt
.\data\.venv-ml\Scripts\python.exe -m pip check
```

On this workstation the Windows `py` alias was inaccessible; C used the
accessible base Python path in the existing backend venv's `pyvenv.cfg` to create
the new environment. B's venv was not changed or used for ML installation. The
workspace temp path avoided sandbox `ensurepip` temp-write failures. Network
permission was needed to download the pinned wheels after sandbox DNS failed.

Do **not** install this whole C file into B's active testing venv. When B is ready,
prepare a separate integration environment, reconcile the ML dependency pins above
with B's application dependencies, and run B's full checks.
B's existing Pydantic version was not downgraded; combined service compatibility
is not established by C's tests. The standalone C environment has no FastAPI/Auth
settings and is not a replacement server environment.

## Exact load and predict command

From the root, with the C environment already installed:

```powershell
@'
import sys
sys.path.insert(0, "server")
from app.contracts.ml import MLInput
from app.ml.predictor import WorkflowClassifier

classifier = WorkflowClassifier()
request = MLInput(description="Prepare a weekly summary of completed orders and recorded sales totals for the store owner.")
print(classifier.predict(request).model_dump_json())
'@ | .\data\.venv-ml\Scripts\python.exe -
```

This command was checked in C's environment and returned `recognized`,
`order_report`, confidence `0.8598550103654391`, model version
`ecommerce-family-v1.0.0`. That is an actual standalone example, not a business
confidence or a promised score for other wording. Running from the root without
adding `server` to Python's import path fails to resolve `app`; the command above
and the training entry point handle it explicitly.

Inside B's app, use the existing validated input:

```python
from app.contracts.ml import MLInput
from app.ml.predictor import WorkflowClassifier

classifier = WorkflowClassifier()  # Once per chosen application lifecycle.
prediction = classifier.predict(MLInput(description=workflow.description))
```

Construction and inference are synchronous file/CPU work. B decides lifecycle
and offloads bounded work from async request handling. The class has no HTTP
route, automatic startup loader, network call, download or retraining fallback.
An instance with a load failure stays unavailable until explicitly reconstructed;
it does not keep retrying silently. Non-MLInput calls raise TypeError; B performs
normal request validation first. Extra feature fields are forbidden by MLInput.

## Trust and compatibility

Only a model version in the shipped `trusted_releases.json` can be selected. The
default is `ecommerce-family-v1.0.0`. There is no public artifact-path argument,
URL, upload or arbitrary model-file selector. The allowlist binds manifest and
pipeline SHA-256; the manifest binds evidence files, runtime source hashes,
versions, preprocessing, class order and fitted structure. Hashes and versions
are checked before joblib deserialization; fitted component/class/shape checks
occur after loading and before inference.

The trust assumption is that this package, allowlist and artifact came from the
trusted project handoff. A checksum beside an arbitrary pickle is not sufficient.
Joblib/pickle can execute code; never register or load untrusted replacements.
This follows [scikit-learn's persistence guidance](https://scikit-learn.org/1.7/model_persistence.html).
Changing source bytes or dependency versions requires a separately validated
release, not edits to the registry merely to bypass a failed check.

| File | SHA-256 |
| --- | --- |
| Pipeline | `f68e068f764be803c4ddfa74d4f79f3f0ecf2594da193a391e9d426802aafb26` |
| Manifest | `044a0cfda2db52522924fb2c79272ce3e1bb9a615ae0b27031177adfd49e1180` |
| Evaluation JSON | `afe1de71063cb9e57e4b196d5c9b00432cb1272450276972c4e8ef1c11c73865` |
| Frozen dataset | `bed6534348fc69fe3347732cb9071a2f2a691eac0d9155edad8fee1439ab2338` |
| Frozen split manifest | `7e8b066f6a242988d909f25dc3b44150a49c90ef73b4ef42d7952a80169842b8` |

## Output semantics B must preserve

`predict(MLInput) -> MLPrediction` is unchanged. Actual class order is
`catalog_cleanup`, `catalog_copy`, `order_report`, `refund_approval`, `stock_alert`,
`support_reply`; probabilities are indexed by the loaded classifier's classes,
not an assumed enum order. JSON keys are snake_case.

- `recognized`: accepted family, actual top-class probability in 0–1, known
  model version, null reason. No final recommendation, priority or ROI.
- `abstained`: null family, model version and a documented reason. Actual highest
  probability is retained for nonzero-feature cases; zero-feature confidence is
  null. Reasons are `out_of_vocabulary`, `unsupported_task`, `low_confidence` or
  `ambiguous_task` according to the frozen policy, not proven semantic diagnoses.
- `unavailable`: null family/confidence and `artifact_missing`, `invalid_artifact`,
  `incompatible_artifact` or `inference_failed`. The version is retained only
  after a trusted valid manifest is known. Exception messages and paths are not
  returned. No zero-valued fake prediction or agency matcher substitution occurs.

The policy rejects zero features, then low support similarity/known-token ratio,
then low probability, then a low top-two margin. See the exact thresholds in the
manifest/report. Four of six held-out compound tasks still passed, so B must
preserve clarification and safety checks using workflow facts. High-risk family
recognition is not authority to automate, particularly for refunds/disputes.

B owns strict prediction validation, HTTP failure/clarification mapping, risk and
final category rules, score/ROI, versioned persistence and grounded AI behavior.
Missing artifacts must remain unavailable, not a successful empty result. A
reviewed fallback needs genuine reviewed content and a separate justification.
The six playbooks remain drafts with null review metadata and cannot supply it.
Health remains unchanged until B actually integrates and verifies the subsystem.

## Reproduce and verify

The shipped directory is immutable; training stages refuse to overwrite it and
held-out evaluation refuses to overwrite saved results. To reproduce in a new
scratch directory, retaining the same dataset/code/pins:

```powershell
.\data\.venv-ml\Scripts\python.exe data/tools/validate_dataset.py
.\data\.venv-ml\Scripts\python.exe data/tools/train_classifier.py freeze --output-root data/.scratch/ml-reproduction
.\data\.venv-ml\Scripts\python.exe data/tools/train_classifier.py evaluate --output-root data/.scratch/ml-reproduction
.\data\.venv-ml\Scripts\python.exe data/tools/validate_dataset.py
```

The first `freeze`/`evaluate` pair ran once for the shipped candidate. The held-out
set is now seen; reproduction verifies the frozen protocol, not a new unbiased
benchmark or permission to tune this release. `register` is an explicit C-owned
packaging operation restricted to the shipped path, not a server startup task.

Normal checks (do not retrain or register just to run tests):

```powershell
.\data\.venv-ml\Scripts\python.exe -m unittest discover -s data/tests -v
.\data\.venv-ml\Scripts\python.exe -m ruff check server/app/ml data/tools data/tests --config server/pyproject.toml
.\data\.venv-ml\Scripts\python.exe -m ruff format --check server/app/ml data/tools data/tests --config server/pyproject.toml
.\data\.venv-ml\Scripts\python.exe -m pip check
```

All 46 C tests passed, including real release replay and a training-only rebuild;
see dated verification (gainvera-backend: `data/VERIFICATION.md`). Unit corruption/version tests
use disposable fixtures and do not modify the release. B's application, hosted,
Auth and database suites were not run. B's next step is isolated integration and
its own checks; A should wait for B's verified analysis responses before wiring ML.
