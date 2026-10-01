# Plan template

Copy into `plans/NNN-slug.md` (NNN = next free number, slug = a few words). Task ids continue
from the previous plan (T01–T10, then T11–T20…). Keep every task block in this exact shape: the
agent receives it verbatim.

Status values: `pending` · `running` · `done` · `blocked` · `failed` · `skipped`.

```markdown
# Plan {NNN} — {Title}

Status: active
Created: {YYYY-MM-DD}
Base branch: {main}
Goal: {one short paragraph: what this batch achieves and why}
Test command: {command that runs the project's tests, or "none"}
Worktree setup: {command a fresh worktree needs, e.g. "npm ci", or "none"}
Status file: {shared status log every task updates, e.g. ESTADO.md; omit the line if none}

## Tasks

## T{nn} — {Title}
- Status: pending
- Depends on: {T{mm}, … or "none"}
- Goal: {what and why, 1–3 lines}
- Context: {files, docs and decisions the agent must read first}
- Scope: may touch {…} / must not touch {…}
- Done when:
  - `{command}` → {expected result}
- Outcome: {filled by the orchestrator: one line + commit}

## Decisions
- {YYYY-MM-DD} T{nn}: {decision} ({orchestrator | agent | Hernán})

## Proposals (new scope)
- {YYYY-MM-DD} T{nn}: {idea noticed while working; for Hernán to decide later}

## Log
- {YYYY-MM-DD HH:MM} T{nn} launched · attempt {n} · agent {agentId}
- {YYYY-MM-DD HH:MM} T{nn} done · branch {branch} · worktree {path} → {sha}
```

A running task's Status line carries the attempt: `- Status: running (attempt 2)`.
The Log is what lets a new orchestrator session find agents, branches and worktrees after a
restart; keep one short line per event.
