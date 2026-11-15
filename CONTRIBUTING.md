# Contributing

Thanks for helping. buZZprep is small on purpose: a dependable daily tool for one person or a small group, easy to self-host. Changes that keep it that way are the easiest to accept.

## Before you start

- For anything beyond a small fix, open an issue first and describe the problem you want to solve. Architectural changes (new services, new databases, replacing a core library) need agreement before code is written; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#decisions).
- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit, and [docs/ROADMAP.md](docs/ROADMAP.md) for what's planned.

## Setup

```bash
npm install
npm run dev:db      # MongoDB in Docker
npm run dev         # no .env needed locally; see docs/DEPLOYMENT.md#local-development
```

## Ground rules

- **Never commit personal data or secrets.** Personal config bundles go in `config/*.local.json` (git-ignored); secrets go in `.env`. Screenshots and fixtures use invented names and data.
- **Domain logic goes in `packages/shared`** as pure, tested functions. The server persists and notifies; the client renders. If a rule about time, schedules, reminders, revision or habits lives in a route handler or a component, it's in the wrong place.
- **Validate at the boundary with the shared zod schemas**, and scope every database query to the signed-in user (`userId` from the session, never from the request body).
- **Time:** store local dates and times as strings (`YYYY-MM-DD`, `HH:mm`) in the profile's time zone; use the helpers in `packages/shared/src/time/`. Never use the server's or browser's local time zone for user data.
- **Notifications** are planned and sent by the server. Don't add browser timers for future reminders, and don't claim a notification behaviour works on iOS without testing it on an installed app on a real iPhone.
- **UI:** follow the existing components and tokens in `apps/web/src/components` and `styles.css`. Indigo is for "now" and primary actions only. Write interface text in plain, sentence-case language that names what happens ("Mark done", "Turn on reminders").
- **Accessibility:** every control has a label, focus is visible, touch targets are at least 44 px, and nothing depends on colour alone.
- **Dependencies:** prefer the platform and existing libraries. Explain any new dependency in the pull request.

## Where code goes

[ARCHITECTURE.md › Code organisation](docs/ARCHITECTURE.md#code-organisation) has the details. In short:

| You're adding…                                              | Put it in                                                                                                                               |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A rule about time, schedules, reminders, revision or habits | A pure function in `packages/shared/src/<domain>/`, exported from that folder's `index.ts`                                              |
| Input validation for a request                              | A zod schema in `packages/shared/src/schemas/`                                                                                          |
| An endpoint                                                 | A handler in `apps/server/src/modules/<area>/<name>.routes.ts`, logic in `<name>.service.ts`, mounted in `src/routes.ts`                |
| A database collection                                       | A model file in `apps/server/src/db/models/`, listed in `USER_OWNED_MODELS` in its `index.ts` so account export and deletion include it |
| A screen                                                    | `apps/web/src/features/<area>/<Name>Page.tsx`, with a route in `app/router.tsx`                                                         |
| Data loading or a change from the web app                   | A hook or request function in that feature's `api.ts`                                                                                   |
| A piece used by one screen                                  | That feature's `components/` or `hooks/`                                                                                                |
| A reusable control                                          | `apps/web/src/components/ui/<name>.tsx`                                                                                                 |

Routes that import Mongoose, and shared web code that imports a feature, fail `npm run lint`.

## Checks

All of these must pass (CI runs them):

```bash
npm run format:check   # npm run format fixes it
npm run typecheck
npm run lint
npm test
MONGODB_TEST_URI=mongodb://127.0.0.1:27017/buzzprep_test npm test -w @buzzprep/server
npm run build
```

Add tests with your change: unit tests in `packages/shared/test` for domain logic, `apps/server/test` for API behaviour, and a `__tests__/` folder beside the module for web logic.

## Pull requests

- One topic per pull request, with a clear description of the problem and the change.
- Include screenshots (phone and desktop, light and dark) for UI changes.
- Update the docs when behaviour, configuration or the API changes.
- By contributing you agree that your contribution is licensed under the [MIT License](LICENSE).

## Reporting bugs

Use the bug report template. For anything security-related, follow [SECURITY.md](SECURITY.md) instead.
