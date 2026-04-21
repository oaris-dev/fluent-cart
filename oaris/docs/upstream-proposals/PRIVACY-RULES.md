# Privacy Rules — Upstream Proposals

> Applies to every file on the `docs/upstream-proposals` branch, every `feat/*` branch pushed to `origin`, every PR body submitted to `fluent-cart/fluent-cart`, and every upstream issue or Discussion.

## Rule

Author every public artifact as if no single consumer plugin motivated it. Frame each proposal by the ecosystem benefit, not by the consumer.

## Categories to avoid

Any of the following in a publicly-pushed branch, PR body, upstream issue, or Discussion is a policy violation:

- **Consumer plugin name.** Never write the plugin name that motivated the proposal. Use a generic placeholder: *"a consumer plugin"*, *"any FluentCart extension plugin"*, *"the consumer plugin"*.
- **Consumer identifier prefix.** Never use the plugin's real hook / option / function prefix. Use `customplugin_*` in examples.
- **Consumer namespace / slug.** Never use the plugin's real slug or text-domain. Use `custom-plugin` / `custom-plugin/*` in examples.
- **Private-repo links.** No URLs pointing at the consumer's private issue tracker, repo tree, or CI artifacts.
- **Consumer-specific implementation details.** Do not describe how the plugin's internals work (e.g. *"the plugin uses `strpos` to match a specific CSS class"*). Generic migration guidance for anyone in the same architectural position is fine.

## OK to keep

- Regulatory concepts as abstract example use cases: Grundpreis, Lieferzeit, Widerrufsrecht, Impressum, GDPR, CCPA, etc.
- Legal citations: § 312j BGB, § 2 PAngV, Article 6 GDPR, etc.
- FluentCart's own public identifiers: `other_info`, `payment_type`, `fulfillment_type`, filter names, etc.
- Ecosystem-benefit framings: *"benefits any plugin needing X"*.

The distinction: **use-case concepts** (fine) vs. **consumer identity** (forbidden). Naming Grundpreis as an example use case is fine. Naming the consumer plugin's internal "Grundpreis module" is not.

## Enforcement

The exact regex patterns that encode the forbidden categories are kept **out of this repo** — maintained locally, per machine, gitignored. They live at:

```
oaris/docs/upstream-proposals/.privacy-patterns.regex
```

[`PRE-SUBMIT-CHECKLIST.md`](PRE-SUBMIT-CHECKLIST.md) runs `grep -nf` against this file on the PR body, proposal doc, and full diff. A missing file aborts submission by design: no bootstrap, no submit.

## Bootstrap (one-time per machine)

On a fresh checkout, create the local pattern file before running any pre-submit check. Ask the project maintainer for the current pattern list; it's short, changes rarely, and is intentionally not version-controlled in this public repo.

File format: one extended-regex pattern per line, no comments (lines starting with `#` would be interpreted as literal patterns by `grep -Ef` and produce false positives). The actual patterns are maintained out-of-band. The file has four patterns covering: consumer plugin name, identifier prefix, slug, private-repo URL.

If the file is missing, the checklist's grep commands fail with *"No such file or directory"* and submission is blocked until bootstrap is complete. This is intentional.

## Why this exists

The first upstream PR (#41) shipped initially with identifiers from all four forbidden categories above (consumer name in the PR body, consumer identifier prefix in code examples, private-repo links in the proposal doc). Scrubbing required a live PR body edit and four doc commits. This file, the out-of-repo pattern list, and the pre-submit checklist together make the same class of miss impossible to reach the "submit" step.
