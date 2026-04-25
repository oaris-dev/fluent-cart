# Fork Addenda — oaris-dev/fluent-cart

> **Precedence note.** The root [`CLAUDE.md`](../../CLAUDE.md) mirrors upstream FluentCart's project-level documentation (build commands, architecture overview, coding rules, global helpers, etc.). This file adds **fork-specific** rules for upstream-proposal sessions. Where this file conflicts with the root, **this file wins** — most notably the upstream "Git Workflow" section says `master | development`, while this fork uses the `master | docs/upstream-proposals | proposal-base | feat/*` workflow described below.

This is a public fork of [FluentCart](https://github.com/fluent-cart/fluent-cart) used to submit upstream pull requests. Each branch contains one isolated, backward-compatible proposal.

## Contributing Guidelines (from upstream)

**IMPORTANT:** Follow FluentCart's [CONTRIBUTING.md](../../CONTRIBUTING.md) strictly:

- **Branch naming:** `feat/short-description`, `fix/short-description`, `docs/short-description`
- **Commit format:** Conventional Commits — `feat: add ...`, `fix: prevent ...`, `perf: optimize ...`
- **PRs target `master`** — stated policy is squash & merge
- **Big features → open a Discussion first** on the upstream repo before submitting the PR
- **Small improvements** (single filter, mechanical fix) → direct PR is fine
- **Testing:** Write unit tests when possible. Always test on clean WP install.

> **Acceptance reality (as of 2026-04-23).** Upstream's actual behavior diverges from the stated policy. Outside PRs are silently batch-closed during periodic `master` force-pushes by the release-mirror workflow (4 PRs closed in one minute on 2026-04-23, including [#41](https://github.com/fluent-cart/fluent-cart/pull/41)) regardless of size or category. The Discussions tab is also dead (3 discussions ever, 0 maintainer replies). 1 outside PR has merged in repo history (#5). Treat the official "small → direct PR / big → Discussion" ladder as aspirational — neither rung produces engagement from outside contributors. Off-GitHub channels (Discord/Slack/support portal) remain unchecked and may be the only working contact path.

## Branch Strategy

Use a stable 4-branch workflow so sync/docs/proposals stay isolated:

- `master` → **sync-only** branch (mirror of `upstream/master`; normally fast-forward, hard-reset if upstream force-pushes)
- `docs/upstream-proposals` → docs/prompt branch only
- `proposal-base` → proposal parent branch, rebased/merged from `master`
- `feat/*` → one proposal per branch, always created from `proposal-base`

Never commit proposal code to `master`.

### Daily Flow

```bash
# 1) Sync
git checkout master
git fetch upstream
git merge --ff-only upstream/master    # if this fails, upstream may have force-pushed
git push origin master                 # /sync-upstream handles hard-reset recovery

# 2) Refresh proposal parent
git checkout proposal-base
git merge --ff-only master
git push origin proposal-base

# 3) Start proposal work
git checkout -b feat/email-footer-hook
```

| Branch | Proposal doc | Description | Status |
|--------|--------------|-------------|--------|
| `feat/email-footer-hook` | [#027](upstream-proposals/027-email-footer-content-hook.md) | Email footer content filter | Re-audited 2026-04-24 against 1.3.22 — zero drift, ready to submit |
| `feat/receipt-section-hooks` | [#028](upstream-proposals/028-receipt-template-override.md) | Receipt section replacement + ordering (Part B); block-email extensibility (Part A) | Re-audited 2026-04-24 — both targets intact in 1.3.22 |
| `feat/s3-custom-endpoint` | [#029](upstream-proposals/029-s3-custom-endpoint.md) | S3-compatible storage endpoint | Re-audited 2026-04-24 — strengthened by upstream's incomplete `provider`-field addition in 1.3.22 |
| `feat/product-editor-custom-fields` | [#025](upstream-proposals/025-product-editor-custom-fields.md) | Product editor custom fields + `other_info` whitelist | Submitted as [PR #41](https://github.com/fluent-cart/fluent-cart/pull/41) on 2026-04-20, **silently closed 2026-04-23** in mass-close event; technically still valid against 1.3.22 if re-attempted |

> **Note:** Proposal #026 (Checkout JS Field Rendering) was withdrawn.
>
> **Submit order if/when the upstream channel unblocks:** #027 (smallest diff, zero drift) → #028 Part B (small, architecturally safe) → #029 (biggest scope, now has upstream momentum to piggyback on) → #028 Part A (defer until `is_customxxx` is enabled) → #025 (re-attempt only after channel resolves).

## Commit Format

```
feat: add fluent_cart/email_footer_content filter
fix: prevent double order creation on reload
perf: optimize product query by 40%
```

## Rules

- **Backward compatible** — Every change must have zero impact when no plugins hook in
- **No consumer-identifying references** — see [`oaris/docs/upstream-proposals/PRIVACY-RULES.md`](upstream-proposals/PRIVACY-RULES.md) for the exact forbidden patterns and approved neutral substitutes. Enforced by grep before any push or PR
- **Clean sync branches** — `master`, `proposal-base`, and `docs/upstream-proposals` must always have clean working trees. Any in-progress work (WIP code, experimental patches, half-drafted changes) lives on a `feat/*` or `wip/*` branch — never in the working tree of a sync branch. When switching away mid-task, `git stash` or commit to a dedicated branch first. Rationale: uncommitted mods on `master` block `git merge --ff-only upstream/master` and silently diverge the fork from upstream
- **Self-contained** — Each branch/PR is independent, no cross-dependencies
- **Minimal changes** — Touch as few files as possible per PR
- **Test-friendly** — Include inline comments explaining how to verify the change

## Pre-submit gate

Every upstream PR must clear [`oaris/docs/upstream-proposals/PRE-SUBMIT-CHECKLIST.md`](upstream-proposals/PRE-SUBMIT-CHECKLIST.md) in full before `gh pr create`. Version sync, proposal-doc alignment, privacy audit, evidence, mechanics, human sign-off — every box checked, every grep clean.

## Session commands

Three slash commands automate the Stage 3–4 fork-side work:

- `/sync-upstream` — sync `master` and `proposal-base` with `upstream/master`. Detects divergence via `git rev-list --left-right --count` and branches: fast-forward when only behind, hard-reset (with explicit prompt + `--force-with-lease`) when upstream has force-pushed. Also flags any newer release on the changelog
- `/audit-proposal NNN` — verify proposal `NNN`'s doc against current upstream (line numbers, default arrays, hook availability, privacy)
- `/submit-pr NNN` — run the full pre-submit checklist, pause for human sign-off, then `gh pr create`

Each refuses to proceed when the gate isn't clean.

### Bootstrap (one-time per machine)

The commands are **not tracked in this repo**. They are maintained in the private consumer repo and symlinked into `.claude/commands/`. `.claude/` is gitignored here to keep the public fork free of operational tooling history. See [`PRIVACY-RULES.md`](upstream-proposals/PRIVACY-RULES.md) for the same pattern applied to `.privacy-patterns.regex`.

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

These commands are only loaded when `.claude/commands/` resolves, which depends on the symlink being present — the symlink is gitignored, so it exists independently of git-checked-out branch. You can invoke them from any branch in the fork, though the commands themselves may check out `master`, `proposal-base`, or `feat/*` as needed.

## Upstream-release check

When an upstream-contribution session is in scope, verify [`docs.fluentcart.com/guide/changelog`](https://docs.fluentcart.com/guide/changelog) against the fork's `upstream/master` tip at session start. FluentCart sometimes ships on paid/distribution channels before pushing to public GitHub, so a newer changelog entry means proposal docs likely need re-audit against the newer version even though it's not yet in `upstream/master`. `/sync-upstream` performs this check.
