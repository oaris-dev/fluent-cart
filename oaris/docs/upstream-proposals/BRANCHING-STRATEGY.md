# FluentCart Fork Branching Strategy

This is the canonical branching model for upstream proposal work.

## Branch Roles

- `main`
  Sync-only branch. Fast-forward it from `upstream/master`. No proposal commits.
- `docs/upstream-proposals`
  Docs, prompts, and planning notes only (`oaris/docs/upstream-proposals/*`, `CLAUDE.md`).
- `proposal-base`
  Clean parent for all proposal branches. Keep it current with `main`.
- `feat/*`
  One proposal per branch. Example: `feat/email-footer-hook`.

## Standard Workflow

```bash
# Sync fork with upstream
git checkout main
git fetch upstream
git merge --ff-only upstream/master
git push origin main

# Refresh proposal parent
git checkout proposal-base
git merge --ff-only main
git push origin proposal-base

# Start work on one proposal
git checkout -b feat/email-footer-hook
```

## PR Rules

- Open PRs from `feat/*` to `fluent-cart/fluent-cart:master`.
- Keep each PR self-contained and backward-compatible.
- Use Conventional Commits (`feat:`, `fix:`, `docs:`).

## Docs Workflow

```bash
git checkout docs/upstream-proposals
# edit docs
git add CLAUDE.md oaris/docs/upstream-proposals
git commit -m "docs: update upstream proposal docs"
git push origin docs/upstream-proposals
```
