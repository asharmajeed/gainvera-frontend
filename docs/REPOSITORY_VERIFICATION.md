# Repository split verification

22 October 2026 (Asia/Karachi), cross-member repository preparation.

Scope: source-only copies and documentation, preserving the original application
folders and frozen ML release. No dependencies, private environments, hosted data,
Git remotes, commits or deployments are created.

## Actual checks

From the original project root:

- `server/.venv/Scripts/python.exe -B scripts/prepare_github_repos.py` completed
  the two copies. Frontend: 88 files, 64 unchanged non-Markdown source hashes;
  backend: 115 files, 88 unchanged non-Markdown source hashes. Each copy also has
  adapted Markdown documents and a `COPY_MANIFEST.json` inventory.
- The helper's read-only `--check` verifies those source hashes against both
  original and copied bytes, repository separation, excluded paths, local links
  and balanced code fences. It checked 84 frontend and 165 backend local links.
- Scoped Ruff lint and format checks passed for `scripts/prepare_github_repos.py`.
- Re-running the preparation command against existing copies returned 1 as
  intended; a before/after hash comparison of every exported file was identical.
  No existing repository work was overwritten.
- A local scan of the 204 exported files (including the parent upload guide)
  found no matching configured private password/secret/token/database-URL values.
  It read private settings only for comparison and printed no values. This is a
  scoped known-value scan, not proof against every possible embedded credential.

From `github/gainvera-backend`, using the **original** isolated Python 3.12.14
ML interpreter, with bytecode writes disabled:

```powershell
# Substitute the original workspace path if it differs on your machine.
& 'D:\Netsol\Gainvera\data\.venv-ml\Scripts\python.exe' -B data/tools/validate_dataset.py
& 'D:\Netsol\Gainvera\data\.venv-ml\Scripts\python.exe' -B data/tools/validate_playbooks.py
& 'D:\Netsol\Gainvera\data\.venv-ml\Scripts\python.exe' -B -m unittest discover -s data/tests -v
```

- Dataset validation passed: 180 descriptions, 60 groups, original 108/36/36
  splits, 60 challenges, zero normalized duplicates and zero group leakage.
- Playbook validation passed: six drafts, zero reviewed, null review metadata,
  no database access or approved guidance.
- **All 46 relocated C tests passed**, zero failures/skips: 18 dataset, 12 draft
  and 16 ML. These check imports/resources from the new backend root, trusted
  artifact reload/replay, fixed-parameter training-only reproduction, class
  order, abstention/unavailable states, integrity/version rejection and schema
  boundaries. They do not change/reselect/retrain the shipped release.
- Tests created an empty `data/.scratch/` directory; it was removed after the
  checks. No venv/dependency copy or install was needed. A fresh checkout still
  needs its own environments; this run does not establish fresh installation or
  combined FastAPI/ML dependency compatibility.

The initial partial export failed because archived root documents needed their
links rebased after moving under `docs/`. The helper was corrected and only its
own incomplete, Git-free output was rebuilt. Original source was untouched.
Existing operational README commands now use explicit clone-parent placeholders;
historical verification/process records remain dated to their original copy.

Application test counts in the imported verification files remain dated prior
evidence. No frontend rebuild, full backend suite, hosted tests, SQL execution or
release retraining is required or claimed for unchanged source copies.
