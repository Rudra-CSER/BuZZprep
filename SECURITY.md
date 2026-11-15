# Security

buZZprep stores personal data: schedules, goals and, in upcoming versions, private journal entries. Security problems are taken seriously.

## Reporting a vulnerability

Please **don't open a public issue**. Use GitHub's private vulnerability reporting (**Security → Report a vulnerability** on the repository). Include what you found, how to reproduce it, and its impact. You'll get an acknowledgement within a few days and a fix or a plan as soon as practical. Please give a reasonable time to fix before disclosing publicly.

Supported versions: the latest release on the default branch.

## How the app protects your data

**Accounts and sessions**

- Passwords are hashed with argon2id (19 MiB memory, 2 iterations) and must be at least 10 characters. Unknown emails and wrong passwords get the same answer, in the same time.
- Sessions are 256-bit random tokens. Only their SHA-256 hash is stored, so a database leak doesn't expose usable sessions. The cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` with the `__Host-` prefix over HTTPS. Sessions last 30 days and are renewed while you use the app; changing your password signs out every other session.
- Registration can require an invite code (including for the first account) or be closed.
- Forgotten passwords are reset with one-time links: 256-bit random tokens, stored only as SHA-256 hashes, valid for 60 minutes and used up on first use. The token travels in the link's fragment, so it never reaches server logs or Referer headers. The forgot-password endpoint answers the same for every address and sends at most one email per account every 2 minutes. Using a link ends every session and every other link of the account. Links are emailed when `SMTP_URL` is set; otherwise the server owner makes them with `npm run password:link`.

**Requests**

- State-changing requests require a custom header that cross-site pages can't send, and an allowed `Origin`. The API never enables CORS.
- Rate limits apply per IP and, for sensitive actions, per account.
- All input is validated with strict schemas before it reaches the database.
- Security headers via helmet, including a Content-Security-Policy that only allows the app's own scripts, styles, fonts and images. There are no third-party scripts, fonts or analytics.

**Isolation and privacy**

- Every record belongs to one user, and every query is filtered by the signed-in user's id. There are no public profiles or shared journals; nothing is visible to other users of the same server.
- Push notification acknowledgements from the service worker are authorised by an HMAC token bound to that notification and user, valid for 7 days.
- Users can download all of their data and delete their account with everything in it.
- The server logs requests without bodies.

**Secrets**

- Secrets come only from the environment (`.env`), never from the source code: `SESSION_SECRET`, `VAPID_PRIVATE_KEY`, `MONGO_ROOT_PASSWORD`, `INVITE_CODE`, `SMTP_URL`.
- The browser only ever receives the VAPID **public** key.
- Production refuses to start with a missing or weak `SESSION_SECRET`.
- Personal configuration bundles (`config/*.local.json`) and `.env` files are git-ignored.

**Deployment**

- In the provided Compose setup, the app listens on `127.0.0.1` only behind an HTTPS reverse proxy, and MongoDB is not exposed outside the Compose network and requires a password.
- The container runs as a non-root user.

See the [deployment security checklist](docs/DEPLOYMENT.md#security-checklist) for the host side.

## Things to know

- Web push messages pass through the browser vendor's push service (Apple, Google or Mozilla). Their content is encrypted end to end between your server and your device, but the push service sees when messages are sent. Reminder texts contain session titles, not journal content.
- Backups made with `mongodump` contain everything, including journals. Store them encrypted or on storage only you can access.
- A demo instance should use invented data only. Never put a real personal profile or journal on a public demo.
