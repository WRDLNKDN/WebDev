# AGENTS.md

This file contains backend-specific instructions for AI coding agents working in
this directory.

These instructions apply to APIs, services, workers, scripts, database code,
infrastructure-facing backend logic, and server-side tests.

## Backend Operating Rules

The agent should:

- behave like a careful senior backend engineer
- inspect existing route, service, and data access patterns before editing
- preserve backward compatibility unless the task explicitly requires a breaking
  change
- prefer targeted, low-risk changes over broad refactors
- validate behavior with tests and local checks before finishing
- update docs when contracts, setup, or operational behavior changes

## Before Editing

Inspect these first when present:

- `package.json`
- API route handlers
- service layer files
- data access or repository layer
- background jobs or workers
- environment variable definitions
- auth and middleware
- database migration folders
- CI workflows
- backend test configuration

Follow existing conventions before adding new structure.

## API and Service Rules

- keep request validation explicit
- keep business logic out of thin route handlers when the repo already uses
  services
- return errors in the repo's established format
- do not silently change response shapes without updating docs and tests
- preserve logging and observability where already present
- prefer clear, readable control flow over clever compact code

## Data and Database Rules

- preserve existing data whenever possible
- prefer additive migrations
- do not rewrite previously applied migrations unless the repo explicitly
  supports it
- review index, trigger, function, and permission impacts before changing schema
- avoid N+1 query patterns and obviously wasteful queries
- keep transaction boundaries intentional and easy to follow

### Supabase / SQL Safety Rules

If this backend uses Supabase or SQL migrations:

- never delete user data unless explicitly requested and clearly safe
- do not casually drop tables, columns, policies, buckets, functions, or indexes
- keep row-level security changes narrow and reviewable
- separate schema and RLS changes if that is the repo convention
- verify policy effects before changing access behavior
- preserve existing production data

## Auth and Security Rules

- do not weaken auth, permissions, or policy checks for convenience
- validate input boundaries carefully
- avoid leaking internal errors or secrets
- do not commit credentials or `.env` files
- preserve auditability and logs for sensitive flows when the repo uses them

## Reliability Rules

When changing backend logic, think through:

- retries
- idempotency
- timeouts
- error paths
- duplicate event handling
- race conditions
- partial failure scenarios

Do not assume the happy path is enough.

## Backend Testing Rules

The agent should run and update the relevant backend checks automatically.

Preferred validation order:

```bash
npm run lint
npm run typecheck || npm run check || true
npm run test
npm run test:unit || true
npm run test:integration || true
npm run test:e2e -- --workers=12 || npm run e2e -- --workers=12 || true
```

If the repo uses another toolchain, adapt to the existing scripts.

Rules:

- every bug fix should include a regression test when practical
- every new API or service behavior should have test coverage at the right level
- do not delete failing tests to make the suite pass
- fix root causes instead of muting assertions
- use the highest safe e2e parallelism supported by the framework, targeting 12
  workers when appropriate

## CI Parity Rules

Inspect CI and mirror important checks locally when possible.

At minimum, look for:

- lint
- typecheck
- unit tests
- integration tests
- e2e tests
- build or package validation
- migration validation if present

Do not consider the task done if the changed backend path would obviously fail
CI.

## Documentation Rules

Update docs when changing:

- API behavior
- response or request shapes
- environment variables
- migrations
- auth requirements
- background job behavior
- operational scripts
- setup or deployment instructions

Check:

- `README.md`
- `docs/`
- API markdown docs
- migration notes
- runbooks or ops docs if present

Also lint markdown if configured.

## Safety Rules

Never:

- delete production data casually
- expose secrets
- disable auth checks to get a task working
- bypass failing tests by removing assertions
- change critical operational behavior without noting the risk

## Final Response

When work is done, report:

1. what backend files changed
2. what contracts or behaviors changed
3. what validation ran
4. any operational or migration risks that remain
