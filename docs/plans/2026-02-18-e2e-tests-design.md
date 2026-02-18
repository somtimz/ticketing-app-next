# E2E Test Suite Design

> **Date:** 2026-02-18
> **Status:** Approved
> **Scope:** Full regression E2E coverage using Playwright

---

## Goals

Add a Playwright E2E suite that covers all major user flows across every role. Tests run against a local dev server with a seeded database, providing fast and deterministic regression coverage that complements the existing 193 unit/route tests.

---

## Approach

**Role-fixture architecture.** A `globalSetup` step seeds the database and logs in once per role, saving each session to a `storageState` file. Playwright projects map each role to its saved state, so individual test files declare which role they need and receive a pre-authenticated browser context — no login step per test. Tests are organized by feature area.

---

## File Structure

```
playwright.config.ts
e2e/
  auth.setup.ts          # Seeds DB + logs in as each role, saves storageState
  fixtures.ts            # Custom test base extending Playwright's test
  .auth/                 # gitignored — saved session files
    employee.json
    agent.json
    teamlead.json
    admin.json
  auth/
    login.spec.ts
  tickets/
    employee.spec.ts
    agent.spec.ts
    teamlead.spec.ts
  kb/
    browse.spec.ts
    manage.spec.ts
  admin/
    users.spec.ts
  analytics/
    workloads.spec.ts
```

---

## Playwright Configuration

`playwright.config.ts` defines five projects:

| Project | Depends on | storageState |
|---------|-----------|--------------|
| `setup` | — | none (runs auth.setup.ts) |
| `employee` | `setup` | `e2e/.auth/employee.json` |
| `agent` | `setup` | `e2e/.auth/agent.json` |
| `teamlead` | `setup` | `e2e/.auth/teamlead.json` |
| `admin` | `setup` | `e2e/.auth/admin.json` |

**Base URL:** `http://localhost:3000`
**Web server:** Playwright starts `npm run dev` automatically before the suite, waits for the server to be ready.
**Browsers:** Chromium only (speed; cross-browser not a priority for internal tooling).
**Retries:** 0 locally, 2 in CI.

---

## Database Strategy

`auth.setup.ts` runs `npm run db:seed` before logging in. All tests assume seeded data exists and do not clean up after themselves. The suite is re-runnable by re-seeding before the next run.

**Test accounts (from seed):**

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | admin123 |
| TeamLead | teamlead1@company.com | teamlead123 |
| Agent | agent1@company.com | agent123 |
| Employee | employee1@company.com | employee123 |

---

## Test Coverage Map

### `auth/login.spec.ts` (no auth required)
- Valid credentials → redirects to dashboard
- Invalid credentials → shows error message
- Logout → clears session, redirects to login

### `tickets/employee.spec.ts` (Employee role)
- Create ticket with required fields → ticket appears in list
- Ticket list shows only own tickets
- View ticket detail page loads correctly

### `tickets/agent.spec.ts` (Agent role)
- All tickets visible in list
- Assign ticket to self
- Status transition: New → InProgress → Resolved
- Add public comment → visible on ticket
- Add internal note → visible to agent
- Internal note not visible to employee on same ticket

### `tickets/teamlead.spec.ts` (TeamLead role)
- All tickets visible in list
- Can update status on any ticket
- Admin routes (e.g. `/dashboard/agents`) return 403 or redirect

### `kb/browse.spec.ts` (Employee role)
- Article list loads with published articles
- Search by keyword returns matching results
- View article detail page
- Submit helpful feedback → button state changes

### `kb/manage.spec.ts` (Agent role)
- Create new draft article
- Publish article
- Edit existing article

### `admin/users.spec.ts` (Admin role)
- User list loads
- Create new user → appears in list
- Deactivate user → marked inactive

### `analytics/workloads.spec.ts` (TeamLead role)
- Workload dashboard page loads
- Agent stats are displayed

---

## Authentication Flow

`auth.setup.ts` runs once before all other projects:

1. Run `npm run db:seed` (shell exec)
2. For each role: navigate to `/login`, fill credentials, submit, wait for dashboard
3. Save `page.context().storageState()` to `e2e/.auth/<role>.json`

Individual test files receive a browser context with the saved state already loaded — the login page is never visited during tests.

---

## Commands

```bash
# Install Playwright (first time)
npx playwright install --with-deps chromium

# Run full suite (starts dev server automatically)
npx playwright test

# Run a single spec
npx playwright test e2e/tickets/agent.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# View last report
npx playwright show-report
```

---

## CI Integration

Add to `package.json`:
```json
"test:e2e": "playwright test"
```

GitHub Actions: run after unit tests pass, using the same `DATABASE_URL` (Neon test branch or local SQLite for CI).

---

## What Is Not Covered

- Cross-browser testing (Chromium only)
- Mobile viewports
- File attachment upload flows (requires Vercel Blob in test env)
- Email delivery verification (fire-and-forget, tested via unit mocks)
- SLA cron job endpoints (tested via unit tests)
