# Commit memo (handoff)

Use for the recent batch of changes (workers, a11y, tests, feed-edit-comment).

## Suggested commit message

```text
chore: workers 12 for Playwright/Vitest, add accessibility sweep, feed-edit-comment fixme

- Playwright: workers 12 (CI + local)
- Vitest: maxWorkers 12, pool forks (unit + RLS config)
- e2e: add accessibility.spec.ts (public + authenticated routes), Feed/Directory axe
- feed-edit-comment: use shared auth, pathname.endsWith for feed GET; test stays fixme until feed stub is hit in env
```

## Optional shorter

```text
chore: test workers 12, accessibility.spec.ts, feed-edit-comment fixme
```

## Note

- Feed-edit-comment e2e remains `test.fixme`: the mocked post does not appear
  (feed request may hit real API when `VITE_API_URL` is set). To re-enable: run
  e2e with same-origin API (no `VITE_API_URL`) or confirm the stub intercepts
  the feed request in your setup.
