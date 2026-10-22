# Separate GitHub repositories

Prepared 22 October 2026 (Asia/Karachi). The original working project stays in
place. Source-only repository copies are under `github/` in that project:

```text
github/
  gainvera-frontend/
    frontend/
    docs/
    AGENTS.md
    PROJECT_CONTEXT.md
    README.md
    VERIFICATION.md
    COPY_MANIFEST.json
  gainvera-backend/
    server/
      app/ml/
    data/
    docs/
    AGENTS.md
    PROJECT_CONTEXT.md
    README.md
    VERIFICATION.md
    COPY_MANIFEST.json
```

## What is included

A's repository contains frontend source, tests, package metadata/lockfile and
documentation. B and C share the backend repository, which contains FastAPI,
database SQL/tests, synthetic CSVs, fixed splits, playbook drafts, the complete
trusted model package, exact ML pins and evaluation. `server/` and `data/` stay
as siblings because training/validation tools depend on those relative paths.

Each copy has its own root README, scoped AGENTS/context, ignore rules and
supporting team documents. Links to source only in the companion repository
are labelled as companion paths rather than broken local links. Backend owns
the API contract after adoption; the frontend copy is a reference snapshot.
Add actual companion GitHub links when the repository owner/URLs are known.

Real environment files, installed dependencies, virtual environments, build
output, caches, scratch files and private key files are excluded. Only the
three named placeholder `.env*.example` files may be included. Preserve nested
`.gitattributes` and the entire model bundle; do not edit frozen artifact bytes.
The original `planning/` and `presentation/` archives remain in the combined
project and are not included in either application repository.

## Local preparation and checks

From the original Gainvera root, with its existing Python environment:

```powershell
.\server\.venv\Scripts\python.exe -B scripts/prepare_github_repos.py
.\server\.venv\Scripts\python.exe -B scripts/prepare_github_repos.py --check
```

The first command is for an absent `github/` directory and refuses to overwrite
an existing export. It makes no Git, network, database or deployment changes.
The check command reads existing copies, compares non-Markdown source hashes,
checks repository separation, excluded file paths, local links and code fences.
It expects clean source-only copies; installed dependencies/build caches will
be reported as excluded files. It is not a general credential scanner.
Actual task checks and limitations are in `docs/REPOSITORY_VERIFICATION.md`.

The copies are independent snapshots, not automatic mirrors. Until the team
switches, the original project is the working copy. Once the team adopts the
two repositories, make new changes in them and maintain their own contexts/logs.
Never regenerate over active repository work. For a future export, choose and
review a new destination in the script rather than deleting someone's checkout.

## Create and upload

Install Git and authenticate to GitHub. Create two empty repositories named
`gainvera-frontend` and `gainvera-backend`; choose your intended visibility.
Do not initialize the remote repositories with a README, license or gitignore
for this initial import. No remote repositories or commits were created by the
folder preparation.

In PowerShell, enter `github/gainvera-frontend` from the original project root:

```powershell
git init -b main
git add --dry-run .
```

Review the file list, then stage and inspect the changes, including configuration
and docs. A path/ignore check does not establish absence of embedded credentials.

```powershell
git add .
git diff --cached --stat
git diff --cached --name-only
git commit -m "Initial frontend import"
git remote add origin https://github.com/YOUR_USERNAME/gainvera-frontend.git
git push -u origin main
```

Run the equivalent commands inside `github/gainvera-backend`, using the backend
URL and a commit message such as `Initial backend and ML import`. Replace
`YOUR_USERNAME` with your user or organization. Git may request your author
name/email and GitHub authentication; configure those privately. Never force a
push or put a token into a remote URL to bypass an authentication error.

After uploading, invite A to the frontend repository and B/C to the backend
repository. Use task branches. An API change includes an updated backend contract
and a version/commit handoff to A, who updates the frontend reference as needed.
GitHub upload does not deploy either app, copy Supabase records, configure local
secrets or establish a newly tested integrated runtime.

[GitHub's existing-code import instructions](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)
