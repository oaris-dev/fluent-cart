# CLAUDE.md — FluentCart Fork (Upstream Proposals)

> Copy this file to the root of your `oaris-dev/fluent-cart` fork as `CLAUDE.md`.

This is a public fork of [FluentCart](https://github.com/fluent-cart/fluent-cart) used to
submit upstream pull requests. Each branch contains one isolated, backward-compatible proposal.

## Contributing Guidelines (from upstream)

**IMPORTANT:** Follow FluentCart's [CONTRIBUTING.md](CONTRIBUTING.md) strictly:

- **Branch naming:** `feat/short-description`, `fix/short-description`, `docs/short-description`
- **Commit format:** Conventional Commits — `feat: add ...`, `fix: prevent ...`, `perf: optimize ...`
- **PRs target `master`** — they squash & merge
- **Big features → open a Discussion first** on the upstream repo before submitting the PR
- **Small improvements** (single filter, mechanical fix) → direct PR is fine
- **Testing:** Write unit tests when possible. Always test on clean WP install.

## Branch Strategy

Use a stable 4-branch workflow so sync/docs/proposals stay isolated:

- `main` → **sync-only** branch (fast-forward from `upstream/master`)
- `docs/upstream-proposals` → docs/prompt branch only
- `proposal-base` → proposal parent branch, rebased/merged from `main`
- `feat/*` → one proposal per branch, always created from `proposal-base`

Never commit proposal code to `main` or `master`.

### Daily Flow

```bash
# 1) Sync
git checkout main
git fetch upstream
git merge --ff-only upstream/master
git push origin main

# 2) Refresh proposal parent
git checkout proposal-base
git merge --ff-only main
git push origin proposal-base

# 3) Start proposal work
git checkout -b feat/email-footer-hook
```

| Branch | Proposal | Status | Needs Discussion? |
|--------|----------|--------|-------------------|
| `feat/email-footer-hook` | Email footer content filter | Priority 1 | No (small) |
| `feat/receipt-section-hooks` | Receipt section replacement + ordering | Priority 2 | Yes (structural) |
| `feat/s3-custom-endpoint` | S3-compatible storage endpoint | Priority 3 | No (mechanical) |
| `feat/product-editor-custom-fields` | Product editor custom fields + `other_info` whitelist | Priority 4 | Yes (big feature) |

> **Note:** Proposal #026 (Checkout JS Field Rendering) was withdrawn.

## Commit Format

```
feat: add fluent_cart/email_footer_content filter
fix: prevent double order creation on reload
perf: optimize product query by 40%
```

## Rules

- **Backward compatible** — Every change must have zero impact when no plugins hook in
- **No consumer-identifying references** — see [`oaris/docs/upstream-proposals/PRIVACY-RULES.md`](oaris/docs/upstream-proposals/PRIVACY-RULES.md) for the exact forbidden patterns and approved neutral substitutes. Enforced by grep before any push or PR
- **Clean sync branches** — `main`, `proposal-base`, and `docs/upstream-proposals` must always have clean working trees. Any in-progress work (WIP code, experimental patches, half-drafted changes) lives on a `feat/*` or `wip/*` branch — never in the working tree of a sync branch. When switching away mid-task, `git stash` or commit to a dedicated branch first. Rationale: uncommitted mods on `main` block `git merge --ff-only upstream/master` and silently diverge the fork from upstream
- **Self-contained** — Each branch/PR is independent, no cross-dependencies
- **Minimal changes** — Touch as few files as possible per PR
- **Test-friendly** — Include inline comments explaining how to verify the change

## Pre-submit gate

Every upstream PR must clear [`oaris/docs/upstream-proposals/PRE-SUBMIT-CHECKLIST.md`](oaris/docs/upstream-proposals/PRE-SUBMIT-CHECKLIST.md) in full before `gh pr create`. Version sync, proposal-doc alignment, privacy audit, evidence, mechanics, human sign-off — every box checked, every grep clean.

## Session commands

Three slash commands automate the Stage 3–4 fork-side work:

- `/sync-upstream` — fast-forward `main` and `proposal-base` from `upstream/master`, flag any newer changelog release
- `/audit-proposal NNN` — verify proposal `NNN`'s doc against current upstream (line numbers, default arrays, hook availability, privacy)
- `/submit-pr NNN` — run the full pre-submit checklist, pause for human sign-off, then `gh pr create`

Each refuses to proceed when the gate isn't clean.

### Bootstrap (one-time per machine)

The commands are **not tracked in this repo**. They are maintained in the private consumer repo and symlinked into `.claude/commands/`. `.claude/` is gitignored here to keep the public fork free of operational tooling history. See `PRIVACY-RULES.md` for the same pattern applied to `.privacy-patterns.regex`.

On a fresh checkout of `oaris-dev/fluent-cart`:

```bash
# Assumes the private consumer repo is at ../onlineshop-cowork (sibling dir).
mkdir -p .claude
ln -s ../../onlineshop-cowork/tools/fork-claude-commands .claude/commands

# Verify:
ls .claude/commands/*.md   # should list the three command files
```

If the symlink is missing or the consumer repo isn't a sibling dir, the slash commands won't load. No bootstrap → no `/sync-upstream`, `/audit-proposal`, or `/submit-pr` — run the equivalents by hand from `oaris/docs/upstream-proposals/PRE-SUBMIT-CHECKLIST.md`.

### Branch scope

These commands are only loaded when `.claude/commands/` resolves, which depends on the symlink being present — the symlink is gitignored, so it exists independently of git-checked-out branch. You can invoke them from any branch in the fork, though the commands themselves may check out `main`, `proposal-base`, or `feat/*` as needed.

## Upstream-release check

When an upstream-contribution session is in scope, verify [`docs.fluentcart.com/guide/changelog`](https://docs.fluentcart.com/guide/changelog) against the fork's `upstream/master` tip at session start. FluentCart sometimes ships on paid/distribution channels before pushing to public GitHub, so a newer changelog entry means proposal docs likely need re-audit against the newer version even though it's not yet in `upstream/master`. `/sync-upstream` performs this check.

## FluentCart Architecture Notes

- **PHP:** PSR-4, `FluentCart\` namespace
- **Frontend:** Vue 3 SPA + Element Plus + Tailwind
- **Email system:** Moving toward Gutenberg block-based composition (`FluentBlockParser`)
- **Receipts:** Class-based rendering (`ReceiptRenderer`, `ThankYouRender`)
- **S3:** Custom driver with 5 operation classes, all hardcode `amazonaws.com`
