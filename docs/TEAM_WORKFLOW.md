# How the Gainvera team shares context

The original combined workspace keeps the full team context. Separate frontend
and backend+data copies were prepared on 22 October 2026; see
[GitHub setup](GITHUB_SETUP.md). Each copy has scoped root instructions/context
and supporting documents. You do not need to paste whole chat histories.

## The four shared files

| File | Simple meaning |
| --- | --- |
| [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) | What Gainvera is, what works now, decisions, roles and what remains |
| [AGENTS.md](../AGENTS.md) | Instructions telling the agent to read and update the context |
| [CHANGELOG.md](CHANGELOG.md) | What each task changed, what was checked and what others need next |
| This file | How members use and share these files; copyable starting prompt |

Keep these files with each repository's source. Backend owns the authoritative
API/ML contracts after adoption; the frontend API document is a reference copy.
Keep context per repository scope, with explicit cross-repository handoffs.

## Starting a new chat

1. Get the latest shared project files before starting new work.
2. Open the relevant repository root, rather than only `frontend/` or `server/`.
   Until the team adopts the split, open the original **Gainvera** root. After
   adoption, A opens **gainvera-frontend** and B/C open **gainvera-backend**.
3. Paste the prompt below, choose A/B/C and write one clear task.
4. The agent reads current context, checks the relevant source, implements the
   task, verifies it and updates the context/log before its final response.

Codex supports `AGENTS.md` as project instructions and discovers them at the start
of a run. Our other filenames are team conventions. The explicit prompt is also
useful for another agent tool, an already-open chat or a setup where instruction
discovery differs. These files are instructions, not a guaranteed update hook.
Check that the final handoff names the context files updated.
[Official OpenAI documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

Copy this into a new chat after giving the agent access to the project:

```text
You are working on Gainvera as Member [A, B or C].
My task for this chat is: [write the specific task here].

Start from the relevant repository root. Read AGENTS.md, PROJECT_CONTEXT.md,
README.md and the newest entries in docs/CHANGELOG.md. Then read the setup
instructions, contracts and source relevant to my role and this task.

Verify the current implementation before editing. The target is an e-commerce
MVP, with preserved agency/fixture demos and real account Auth/storage. Use
current code and verification to establish what works; result integration is
still incomplete. Preserve the other members' work and repository boundaries.

Briefly state the relevant current state, then carry out my task and run the
appropriate checks. Do not implement the whole roadmap without being asked.
Before finishing, update PROJECT_CONTEXT.md and add a dated docs/CHANGELOG.md
entry, including actual checks, incomplete work and handoffs. Update any affected
contracts/setup docs too. Finish with what changed, check results, context files
updated and what the other members need next. Use simple English.
```

Role reminder: A = frontend; B = backend/database/auth/AI/rules/ROI;
C = dataset/playbooks/classifier/evaluation. The full ownership table is in the
context. No role is implied merely by opening a particular folder.

If the agent cannot read the repository, attach/paste the latest AGENTS.md,
PROJECT_CONTEXT.md, relevant contracts and source files along with your task.
Ask it to return exact file edits and updated context/log text. A chat without
file access cannot update your local project automatically. Do not paste secrets.

## Finishing and sharing a task

1. The agent makes the code and context changes together. The context is a short
   current snapshot; the change log keeps the history.
2. The member reviews the changed files, checks and handoff. Incomplete work stays
   labelled incomplete. A working classifier alone does not mean the API/UI uses it.
3. Share the code changes **and** context/log/contract changes together.
4. The next member gets those latest files before asking an agent to continue.
   In an ongoing chat, tell the agent to re-read them after receiving updates.

Example: C supplies a model. C records the artifact version and actual evaluation,
updates the ML status to "supplied; not integrated" and gives B the exact paths.
B later wires and tests inference, then updates that status. A only marks the UI
connected after the frontend actually uses the tested endpoint.

## How the files reach the other computers

The chosen preparation is two repositories: `gainvera-frontend` for A and
`gainvera-backend` for B/C. Backend keeps `server/` and `data/` as siblings. Copies
are prepared locally; Git/remotes/uploads are not created. After the team adopts
them, use task branches and review/merge code with the relevant context/log.
Get the latest main branch before starting new work. Do not edit the original
and repository copies as independent masters: they do not synchronize.

B owns the authoritative API contract. Send A the exact backend version/commit,
newly working routes, migration effects and failure semantics. A updates its
contract reference with that provenance and verifies each newly connected flow.
C and B coordinate their shared runtime, data and artifact changes in the backend
repository. Add real companion GitHub links once the URLs are known.

Use the [upload instructions](GITHUB_SETUP.md) for both prepared repositories.
Never commit `.env`, API tokens, `node_modules/`, `.next/`
or `.venv/`. The current ignore files cover these local dependencies/environment
files in their application directories.

If you cannot set up Git yet, choose one member to maintain the master project
copy. Exchange the changed source plus context/log/contracts with that member,
who combines and checks them before sending everyone an updated copy. Avoid two
members editing the same shared files at the same time. Do not overwrite the
whole master folder with an older copy or send installed dependencies/secrets.

If two members change context on separate branches/copies, combine both relevant
sections and both log entries. Do not keep only the newest entire file. Confirm
the combined code before describing a combined feature as implemented.

**Updating a file on one computer does not update another computer or chat.**
Sharing/pulling the latest files is what carries the context between members.

## What belongs in an update

Record the result, important file paths, actual commands/results, decisions,
known limits and the next member's dependency. For example: "B: token verification
implemented and tested; A must send a Supabase access token." Do not record
unnecessary chat history, secret values or guesses as facts.

For documentation-only changes, check links, paths and consistency. Keep older
application test evidence dated rather than claiming to have rerun it. For work
that is interrupted or failing, record what is incomplete and how to continue.
