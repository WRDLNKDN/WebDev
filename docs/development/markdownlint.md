# Markdownlint in this repo

We use [markdownlint](https://github.com/DavidAnson/markdownlint) (via
`markdownlint-cli`) to keep Markdown consistent. Config: `.markdownlint.json`.

## Why `--fix` doesn't fix everything

`npm run lint:md:fix` runs `markdownlint . --fix --ignore node_modules`.

**Only some rules are auto-fixable.** The library adds fix logic only for a
subset of rules. For the rest, violations are reported but not changed.

Examples of rules that typically **do not** auto-fix in this setup:

- **MD013** — Line length (e.g. max 80). You must wrap or shorten lines by hand.
- **MD040** — Fenced code blocks must have a language (e.g. ` ```text `). You
  must add the language yourself.
- **MD060** — Table column style (e.g. aligned/compact). You must align pipes or
  adjust table formatting yourself.

So when the pre-commit hook or `npm run lint:md` fails, running
`npm run lint:md:fix` will fix only what the library can fix; the rest must be
edited manually.

## Pre-commit behavior

1. **lint-staged** runs first on staged files: Prettier and `markdownlint --fix`
   run on staged `*.md` files. That way fixable issues in staged files are
   corrected before the full check.
2. **Full markdown check** runs next: `markdownlint . --ignore node_modules`
   over the whole repo. If anything still fails, the commit is blocked.

So fixable issues in staged Markdown are auto-fixed; anything left (including
unfixable rules) must be fixed by hand before committing.

## Commands

- `npm run lint:md` — Check only (no file changes).
- `npm run lint:md:fix` — Check and apply fixes where the rules support it.
