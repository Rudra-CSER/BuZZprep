# API

A JSON REST API under `/api/v1` (plus the unversioned `/api/health` and `/api/meta`), used by the PWA. It is not a public API: it is designed for the app on the same origin, with cookie sessions.

The source of truth for request bodies is the zod schemas in `packages/shared/src/schemas/`; route handlers are in `apps/server/src/modules/<module>/<name>.routes.ts`, and the logic behind them in the matching `<name>.service.ts`.

## Conventions

**Authentication.** `POST /auth/register` and `POST /auth/login` set an `HttpOnly` session cookie (`__Host-bp_session` over HTTPS, `bp_session` on plain-HTTP local development). Everything except `/api/health`, `/api/meta`, registration, sign-in and the service worker's notification acknowledgement requires it. Paths below are relative to `/api/v1` unless shown in full. Sessions last 30 days and are extended while you use the app.

**CSRF protection.** Every `POST`, `PUT`, `PATCH` and `DELETE` must:

- carry the header `X-Requested-With: buzzprep`, which a cross-site form can't send and a cross-site script can't send without a CORS preflight (the API never grants one), and
- if an `Origin` header is present, it must be `PUBLIC_APP_URL` or listed in `ALLOWED_ORIGINS`.

```bash
curl -X POST https://prep.example.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://prep.example.com' \
  -H 'X-Requested-With: buzzprep' \
  -c cookies.txt \
  -d '{"email":"you@example.com","password":"correct horse battery"}'
```

**Dates and times.** Local dates are `YYYY-MM-DD`, local times `HH:mm`, both in the profile's time zone. Instants are ISO 8601 strings in UTC. Ids are 24-character hex strings.

**Errors.** Non-2xx responses have this shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Use at least 10 characters",
    "issues": [{ "path": "password", "message": "Use at least 10 characters" }]
  }
}
```

| Status | `code`                            | When                                                                             |
| ------ | --------------------------------- | -------------------------------------------------------------------------------- |
| 400    | `validation_error`, `bad_request` | Invalid body, query or id.                                                       |
| 401    | `unauthorized`                    | Not signed in, or the session expired.                                           |
| 403    | `forbidden`                       | Wrong origin or missing header, registration closed, wrong invite code.          |
| 404    | `not_found`                       | Doesn't exist, or belongs to someone else.                                       |
| 409    | `conflict`                        | Duplicate (for example an email already registered).                             |
| 413    | `too_large`                       | Body over 1 MB.                                                                  |
| 429    | `rate_limited`                    | Too many requests; retry later.                                                  |
| 500    | `internal_error`                  | Unexpected error (details are logged, not returned).                             |
| 503    | `unavailable`                     | A feature isn't configured on this server (for example push without VAPID keys). |

**Rate limits.** 300 requests per minute per IP across the API; 20 sign-in or registration attempts per 15 minutes per IP; tighter per-user limits on password change, data export, import, account deletion and test pushes.

**Caching.** API responses are `Cache-Control: no-store`. The app keeps its own offline cache.

## Endpoints

### Meta

| Method | Path          | Description                                                                                                                                              |
| ------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health` | `200 { status: "ok", db: "connected" }`, or `503` when the database is down. Used by Docker.                                                             |
| GET    | `/api/meta`   | Instance info before sign-in: `{ name, version, registrationMode, pushEnabled, setupRequired }`. `setupRequired` is true until the first account exists. |

### Auth and account

| Method | Path                | Description                                                                                             |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`    | `{ email, password (10+ chars), displayName, timezone, inviteCode? }`. The first account becomes admin. |
| POST   | `/auth/login`       | `{ email, password }`.                                                                                  |
| POST   | `/auth/logout`      | Ends the current session.                                                                               |
| GET    | `/auth/me`          | `{ user, onboardingCompleted, timezone, theme }`.                                                       |
| PATCH  | `/account`          | `{ displayName }`.                                                                                      |
| POST   | `/account/password` | `{ currentPassword, newPassword }`. Signs out your other sessions.                                      |
| GET    | `/account/export`   | Downloads all of your data as JSON (no session tokens or device keys).                                  |
| DELETE | `/account`          | `{ password, confirm: "DELETE" }`. Permanently deletes the account and all of its data.                 |

### Profile, setup and configuration

| Method | Path                                  | Description                                                                                             |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/profile`                            | Your profile (time zone, day boundary, work, sleep, study, notification preferences…).                  |
| PATCH  | `/profile`                            | Partial update. Changing the time zone or notification preferences re-plans reminders.                  |
| GET    | `/onboarding/templates`               | Preparation templates for the setup wizard.                                                             |
| GET    | `/onboarding/templates/:key/defaults` | Suggested answers for a template.                                                                       |
| GET    | `/onboarding/answers`                 | Your saved setup answers, if any.                                                                       |
| POST   | `/onboarding/preview`                 | Answers → generated plan summary, without saving.                                                       |
| POST   | `/onboarding/complete`                | Answers → plan, routine, reminders, tracks, habits and companies are created (replacing previous ones). |
| GET    | `/config/export`                      | Your configuration as a portable config bundle (no journal entries or history).                         |
| POST   | `/config/import`                      | `{ bundle, mode: "replace" \| "merge" }`. Returns a summary of what was created or updated.             |

### Plans and milestones

| Method | Path                                 | Description                                 |
| ------ | ------------------------------------ | ------------------------------------------- |
| GET    | `/plans`                             | All plans.                                  |
| GET    | `/plans/active`                      | The active plan.                            |
| PATCH  | `/plans/:id`                         | Update goal, companies, dates, description. |
| POST   | `/plans/:id/activate`                | Make this the active plan.                  |
| POST   | `/plans/:id/milestones`              | `{ title, dueDate, note? }`.                |
| PATCH  | `/plans/:id/milestones/:milestoneId` | Edit, or mark `completed`.                  |
| DELETE | `/plans/:id/milestones/:milestoneId` |                                             |

### Schedules and activities

| Method | Path                       | Description                                                                             |
| ------ | -------------------------- | --------------------------------------------------------------------------------------- |
| GET    | `/schedules`               | Routines with activity counts.                                                          |
| POST   | `/schedules`               | `{ name, description? }`.                                                               |
| PATCH  | `/schedules/:id`           | Rename.                                                                                 |
| POST   | `/schedules/:id/activate`  | Switch the active routine.                                                              |
| POST   | `/schedules/:id/duplicate` | Copy a routine with its activities and reminders.                                       |
| DELETE | `/schedules/:id`           | Delete an inactive routine (its activities are archived).                               |
| POST   | `/schedules/reset`         | Regenerate the default routine from your saved setup answers.                           |
| GET    | `/activities`              | Activities in the active routine, with end time, recurrence label and reminder presets. |
| GET    | `/activities/:id`          |                                                                                         |
| POST   | `/activities`              | Activity fields plus `reminders: { upcomingMinutes, atStart, overdueMinutes }`.         |
| PATCH  | `/activities/:id`          | Partial update, including reminder presets.                                             |
| DELETE | `/activities/:id`          | Archives the activity and deletes its reminders. Past history is kept.                  |

### Agenda, sessions and day modes

| Method | Path                                         | Description                                                                                  |
| ------ | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/agenda?from=&to=`                          | Expanded sessions for up to 62 days, with day modes applied and status merged in.            |
| GET    | `/occurrences/review`                        | Sessions that need a decision (ended, not marked).                                           |
| GET    | `/occurrences/:activityId/:date`             | One session and its activity.                                                                |
| PATCH  | `/occurrences/:activityId/:date`             | `{ status?: "pending" \| "completed" \| "skipped", actualMinutes?, note? }`.                 |
| POST   | `/occurrences/:activityId/:date/reschedule`  | `{ date, startTime, durationMinutes? }`. Response includes any `conflicts`.                  |
| POST   | `/occurrences/:activityId/:date/postpone`    | `{ minutes }`.                                                                               |
| DELETE | `/occurrences/:activityId/:date/override`    | Undo a move.                                                                                 |
| GET    | `/occurrences/:activityId/:date/suggestions` | Up to four free slots in the next three days, avoiding busy blocks and quiet hours.          |
| GET    | `/day-modes?from=&to=`                       | Day modes in a range.                                                                        |
| PUT    | `/day-modes/:date`                           | `{ mode: "normal" \| "busy" \| "low_energy" \| "recovery", note?, until? }` (up to 31 days). |
| DELETE | `/day-modes/:date`                           | Back to normal.                                                                              |

`:date` is the session's original logical date, even after it was moved.

### Reminders and push

| Method | Path                        | Description                                                                                                                                                                      |
| ------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/reminders`                | Reminder rules.                                                                                                                                                                  |
| POST   | `/reminders`                | `{ kind, anchor, activityId?, offsetMinutes?, time?, recurrence?, daysBefore?, title?, body?, enabled?, bypassQuietHours? }`                                                     |
| PATCH  | `/reminders/:id`            |                                                                                                                                                                                  |
| DELETE | `/reminders/:id`            |                                                                                                                                                                                  |
| GET    | `/push/config`              | `{ enabled, publicKey }`. The VAPID **public** key only.                                                                                                                         |
| GET    | `/push/subscriptions`       | Your devices with reminders on.                                                                                                                                                  |
| POST   | `/push/subscriptions`       | `{ endpoint, keys: { p256dh, auth }, expirationTime?, deviceLabel? }` from `PushManager.subscribe()`.                                                                            |
| DELETE | `/push/subscriptions/:id`   | Stop sending to a device.                                                                                                                                                        |
| POST   | `/push/unsubscribe`         | `{ endpoint }`. Used when a device turns reminders off.                                                                                                                          |
| POST   | `/push/test`                | Send a test notification to all your devices.                                                                                                                                    |
| GET    | `/notifications?limit=`     | Recent notifications (default 50, at most 100) with delivery status.                                                                                                             |
| GET    | `/notifications/upcoming`   | What's planned next.                                                                                                                                                             |
| POST   | `/notifications/:id/snooze` | `{ minutes }` (1–240). Sends it again later.                                                                                                                                     |
| POST   | `/notifications/:id/skip`   | Don't send this one reminder.                                                                                                                                                    |
| POST   | `/notifications/:id/events` | Service worker receipts: `{ type: "delivered" \| "clicked" \| "action", action?, snoozeMinutes?, token }`. Authorised by the signed `token` from the payload, or by the session. |

### Dashboard

| Method | Path         | Description                                                                                                                                                                                                              |
| ------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/dashboard` | Everything the home screen needs in one call: greeting, plan progress, today's sessions, what needs a decision, next session, next reminder, last 7 days, DSA and system design progress, journal status, device status. |

## Coming in the next phases

Learning (tracks, topics, problems, revision queue, study sessions), journal, habits and career endpoints. Their data models already exist (see [DATA_MODEL.md](DATA_MODEL.md)) and are filled by the setup wizard; the endpoints and screens are listed in [ROADMAP.md](ROADMAP.md).
