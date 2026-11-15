# Roadmap

buZZprep is built in phases. Each phase ends with a report: what's done, what's pending, which tests ran, and the technical debt it leaves. Major architectural changes wait for the maintainer's approval.

| Phase | Scope                                                                                       | Status                                                                          |
| ----- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1     | Architecture, repository structure, data model, API design, PWA/iOS feasibility, wireframes | Done                                                                            |
| 2     | UI foundation: design system, app shell, auth, setup wizard, PWA install                    | Done                                                                            |
| 3     | Scheduling engine: routines, day/week/month, day modes, missed sessions, free slots         | Done                                                                            |
| 4     | Notifications: rules, server scheduler, Web Push, device management                         | Done; **real-iPhone verification pending**                                      |
| 5     | Learning: DSA log, spaced revision, system design, CS fundamentals                          | Next. Data model, templates and seed data exist; screens and endpoints to build |
| 6     | Journal: morning, evening, weekly; mood, energy, tags; search; Markdown/JSON export         | Planned. Data model exists                                                      |
| 7     | Habits: consistency without shaming, comebacks                                              | Planned. Engine (`habits.ts`) and data model exist                              |
| 8     | Career dashboard: companies, stages, interviews, referrals                                  | Planned. Data model exists; seeded from your target companies                   |
| 9     | Production readiness: E2E tests, accessibility audit, observability, calendar feed          | Partly done (Docker, CI, docs, backups)                                         |

## Phase report: phases 1–4

### Completed

**Foundation**

- npm-workspaces monorepo: `packages/shared` (domain engine + schemas), `apps/server`, `apps/web`; strict TypeScript, ESLint, Prettier, CI.
- Docker image (API + scheduler + PWA in one container), Compose stack with MongoDB and Caddy (automatic HTTPS), nginx example, environment validation, health checks.
- Documentation: architecture, data model, API, notifications and iOS feasibility, deployment, wireframes.

**Accounts and privacy**

- Registration (open / invite / closed; the first account becomes admin; invite mode protects even the first account), sign-in, sign-out, password change (signs out other sessions), server-side password reset command.
- argon2id passwords, hashed session tokens in `HttpOnly` cookies, Origin + header CSRF protection, rate limits, strict CSP.
- Download all data (JSON); delete account and all data.
- Configuration bundles: import/export in the app or from the command line; personal seed files are git-ignored.

**Setup wizard**

- Ten steps: goal and template (8 templates), timeline, work, sleep (with gradual shift), study time, skills, tracks, reminders and quiet hours, fitness, and a live preview of the generated plan.
- Generates the routine, reminders, learning tracks with topics and resources, milestones, habits and target companies. "Reset to default schedule" regenerates from the saved answers.

**Schedule**

- Routines (several, one active; duplicate, rename, delete), activities with recurrence, priority, essential/blocking flags, per-activity reminders, and gradual time shifts.
- Home: day strip (04:00 → 04:00), Now/Next with Start session and Mark done, sessions needing a decision, today's list, last 7 days, progress, reminders, milestones.
- Day, week and month views; session sheet (done, skip, +15/+30/+60 minutes, find a free slot, notes); focus timer that keeps the screen awake where supported.
- Day modes (normal, busy, low energy, recovery) for one day or a range, with per-category rules; essential activities are never changed.
- Missed sessions are never auto-completed: after a grace period they need a decision, with free-slot suggestions.
- Plan page: goal, companies, dates and milestones.

**Notifications**

- Reminder kinds: upcoming, starting now, overdue, missed-sessions digest, daily planning, journal, sleep (wind-down, bedtime, wake-up), weekly review, milestones, custom.
- Server-side planning into a durable MongoDB outbox; atomic dispatch with retries, expiry and condition checks; quiet hours, per-kind switches, muted categories.
- Web Push with VAPID; Declarative Web Push payloads; service worker with delivery and click receipts; Mark done/Snooze actions where the platform supports them.
- Notifications screen: install guide on iPhone, enable/disable per device, test push, devices list, quiet hours, what's coming up (skip one), recent deliveries with status.

**PWA**

- Manifest, maskable and Apple touch icons, shortcuts, iOS meta tags, safe areas, light/dark/system theme, offline app shell, persisted query cache, offline-queued check-ins, update prompt.

### Pending

- **Phase 4 verification on a real iPhone** using the [test plan](NOTIFICATIONS.md#real-device-test-plan-iphone). Background notifications on iOS must not be described as working until this passes.
- Learn tab: tracks, topics, problem log (independent / hints / editorial / unsolved), revision queue, study sessions linked to schedule sessions. Today it shows a placeholder.
- Journal tab: guided morning/evening/weekly entries, mood and energy, tags, full-text search, Markdown and JSON export. Today it shows a placeholder.
- Habits and career screens.
- Signed-in devices list (sessions are already recorded).
- Calendar feed (iCalendar with alarms) as a reliable alternative for time-critical reminders on iOS.

### Tests run

| Suite                               | Result                                                                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` unit tests        | 68 passed: time and DST, recurrence, agenda expansion, day modes, progression, missed sessions, free slots, reminder planning and quiet hours, revision, progress, habits, plan generation                 |
| `apps/server` unit tests            | 16 passed: environment validation, notification tokens, push payloads, failure classification and backoff, serialisation, security headers, CSRF guard, validation, auth requirements                      |
| `apps/server` API integration tests | 19 tests written (full flow against MongoDB). They run in CI with a MongoDB service, or locally with `MONGODB_TEST_URI`. **Not yet run in the environment this phase was built in, which had no MongoDB.** |
| `apps/web` unit tests               | 7 passed: iOS/install detection, push capability, formatting                                                                                                                                               |
| Type checking, lint                 | Clean across all workspaces                                                                                                                                                                                |
| Production build                    | Web (45 precached files, about 1.25 MB) and server bundles build; the server starts and waits for MongoDB                                                                                                  |
| UI review                           | Screens checked at iPhone and desktop sizes in light and dark mode against a mock API                                                                                                                      |

### Technical debt and risks

1. **Integration tests haven't run yet.** First step for the maintainer: run them in CI or locally (see [DEPLOYMENT.md](DEPLOYMENT.md#local-development)) and fix anything they find.
2. **iOS push is unverified on hardware.** See above.
3. **Bundle size.** About 250 kB of JavaScript (gzipped) on first load, mostly React, React Router, TanStack Query, Radix and Luxon. Routes are lazy-loaded; Luxon could be replaced with smaller `Intl`-based helpers in the client.
4. **Profile sub-documents are `Mixed` in Mongoose.** They are validated by zod at the API boundary, not by Mongoose. A shape change will need a small migration; the config-bundle `version` field gives a place to handle it.
5. **Reconcile is O(users) every 10 minutes.** Fine for self-hosting and small groups; a large multi-user instance would need batching (see [ARCHITECTURE.md](ARCHITECTURE.md#d1-mongodb-outbox--in-process-scheduler-instead-of-bullmq-and-redis--needs-approval)).
6. **"Delivered" receipts depend on the service worker.** If iOS shows a declarative notification without running the service worker, the status stays "Sent", which is not an error.
7. **No end-to-end browser tests yet** (Playwright), and no formal accessibility audit (VoiceOver, keyboard-only).
8. **English only**; dates use the profile's 12/24-hour preference but no other locale settings.
9. **TypeScript is pinned to 6.x** until typescript-eslint supports TypeScript 7.

### Decisions that need approval

- **D1: MongoDB outbox + in-process scheduler instead of BullMQ/Redis.** Rationale and costs in [ARCHITECTURE.md](ARCHITECTURE.md#d1-mongodb-outbox--in-process-scheduler-instead-of-bullmq-and-redis--needs-approval).
- **D2: TanStack Query for server state**, alongside Zustand for UI state. See [ARCHITECTURE.md](ARCHITECTURE.md#d2-tanstack-query-for-server-state--needs-approval).

## Next phases in detail

### Phase 5: Learning

- Tracks and topics with status, confidence, notes, resources and "practical implementation" notes for system design.
- DSA problem log: link, platform, difficulty, tags, approach, code, complexity, attempts with outcome. "Solved independently" only when no hints, editorial or AI were used; a problem first solved with help keeps that record.
- Revision queue on intervals of 1, 3, 7, 14 and 30 days (configurable), shown on Home and as a "light revision" reminder.
- Study sessions recorded from the focus timer and linked to schedule sessions; time per track per week.
- Endpoints: `/tracks`, `/topics/:id`, `/problems`, `/problems/:id/attempts`, `/revision/queue`, `/study-sessions`.

### Phase 6: Journal

- Morning (intention, top three, energy), evening (what went well, what got in the way, tomorrow) and weekly review prompts, plus free-form entries.
- Mood, energy, tags; full-text search; filters by type and date.
- Export to Markdown and JSON. Entries are only ever visible to their author.

### Phase 7: Habits

- Habits linked to schedule categories (for example gym completes the "Gym" habit), manual check-offs, rest days, grace misses per week.
- Consistency over 4 and 12 weeks instead of fragile streaks; "welcome back" after a gap instead of a reset to zero.

### Phase 8: Career

- Companies by tier (dream, target, safe), stages from interested to offer, referrals and contacts, deadlines.
- Interview rounds with questions asked, feedback and lessons learned, feeding back into Learn.

### Phase 9: Production readiness

- Playwright end-to-end tests including offline behaviour; accessibility audit; structured metrics for reminders; signed-in devices list; optional calendar feed; automated backups in Compose.
