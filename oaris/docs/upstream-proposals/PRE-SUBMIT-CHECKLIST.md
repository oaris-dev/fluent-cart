# Pre-Submit Checklist — Upstream PRs

> Every upstream PR runs this gate **in full** before `gh pr create`. Every box checked, every command run, user sign-off required. No exceptions.

## 0. Bootstrap (one-time per machine)

Before the first run on any machine, confirm the local privacy-patterns file exists:

```bash
test -f oaris/docs/upstream-proposals/.privacy-patterns.regex || \
    echo "BOOTSTRAP MISSING — see PRIVACY-RULES.md before proceeding"
```

If missing, create it as described in [`PRIVACY-RULES.md`](PRIVACY-RULES.md) and re-run this check. **Missing file = do not submit.**

## 1. Version sync

- [ ] `git fetch upstream` ran within the last hour
- [ ] Local `main` is `--ff-only` to `upstream/master`
- [ ] Local `proposal-base` is `--ff-only` to `main`
- [ ] Feat branch has been rebased onto `proposal-base` since the last upstream fetch
- [ ] Checked [docs.fluentcart.com/guide/changelog](https://docs.fluentcart.com/guide/changelog) for a FluentCart release newer than our proposal's last audit; and checked whether that changelog lists a version more recent than `upstream/master` tip (FluentCart sometimes ships on the paid/distribution channel before pushing to public GitHub)
- [ ] If either check finds a newer version: re-audit the proposal doc against it and restart this checklist

Commands:

```bash
git fetch upstream && \
git log -1 --format='%h %ci %s' upstream/master
```

## 2. Proposal-doc alignment

- [ ] A matching proposal doc exists under `oaris/docs/upstream-proposals/NNN-*.md` on the `docs/upstream-proposals` branch
- [ ] Its header field `FluentCart Version:` matches `upstream/master` tip
- [ ] Line numbers in the doc's code snippets match the current source
- [ ] Default arrays / config values in the doc match the current source (if applicable)
- [ ] After submission: the doc's `Status:` field will be updated to reference the PR number

## 3. Privacy audit — see [`PRIVACY-RULES.md`](PRIVACY-RULES.md)

Run each grep using the out-of-repo pattern file and expect **zero matches**. Scrub any hit before proceeding.

- [ ] PR body (staged file):
  ```bash
  grep -nEf oaris/docs/upstream-proposals/.privacy-patterns.regex /tmp/pr-NNN-body.md
  ```
- [ ] Proposal doc referenced by the PR:
  ```bash
  grep -nEf oaris/docs/upstream-proposals/.privacy-patterns.regex \
      oaris/docs/upstream-proposals/NNN-*.md
  ```
- [ ] Full diff being submitted:
  ```bash
  git diff upstream/master..HEAD | \
      grep -nEf oaris/docs/upstream-proposals/.privacy-patterns.regex
  ```
- [ ] Consumer-identifying framings in the PR body are phrased as generic `consumer plugin` / `any FluentCart extension plugin` language

A missing pattern file causes these greps to fail with an error. That's intentional — no silent pass. Do not attempt to "fix" it by running greps without `-f`; bootstrap the file first.

## 4. Evidence

- [ ] **If bug-fix:** a local reproduction log is attached under a `## Reproduction` section in the PR body, showing the bug on a running install (version stamp + before/after state)
- [ ] **If new hook/filter:** a worked example-plugin-usage code block is in the PR body (using the approved neutral `customplugin_*` / `custom-plugin/*` placeholders)
- [ ] **Backward-compat rationale** stated in the PR body (explicitly: what behaviour is identical when no consumer hooks in)
- [ ] **Test plan** stated in the PR body (numbered or bulleted steps)

## 5. Mechanics

- [ ] Diff footprint stated in the PR body matches `git diff --stat upstream/master..HEAD`
- [ ] Commit messages follow Conventional Commits (`feat(scope):`, `fix(scope):`, `perf:`, `docs:`, `chore:`)
- [ ] PR title under 70 chars, Conventional prefix, no emoji
- [ ] Target branch: `master`
- [ ] Target repo: `fluent-cart/fluent-cart`
- [ ] Head: `oaris-dev:feat/<branch-name>`
- [ ] `gh pr create` command printed for review, not executed

## 6. Sign-off

- [ ] User reviewed the final PR body (print it, don't paraphrase)
- [ ] User explicitly authorised `gh pr create` in the current session

**Only then:** run `gh pr create`.

---

## Post-submit follow-ups

After successful submission, before session end:

- [ ] Update proposal doc's `Status:` field with `[PR #NN](...)` link; commit and push `docs/upstream-proposals`
- [ ] Notify the cowork session so the consumer-side issue tracker gets a cross-reference

## Why this file exists

PR #41 shipped with two classes of miss this checklist prevents:

1. **Version staleness** — the PR was drafted against 1.3.15; upstream released 1.3.19 the same day; the rebase + body revision cost an hour mid-submission.
2. **Privacy leaks** — the PR body and proposal doc contained forbidden consumer-identifying patterns that had to be scrubbed post-hoc with a live PR body edit and four doc commits.

Every box here maps to a concrete miss. Skipping boxes reintroduces the risk.
