# Deployment

This guide puts buZZprep on your own subdomain, for example `prep.example.com`, with automatic HTTPS. Everything runs in Docker: the app (API, reminder scheduler and PWA in one container), MongoDB, and Caddy as the HTTPS reverse proxy.

- [Requirements](#requirements)
- [1. Point your subdomain at the server](#1-point-your-subdomain-at-the-server)
- [2. Configure](#2-configure)
- [3. Start](#3-start)
- [4. Create your account](#4-create-your-account)
- [5. Load your personal setup (optional)](#5-load-your-personal-setup-optional)
- [6. Install on your phone](#6-install-on-your-phone)
- [Updating](#updating) · [Forgotten password](#forgotten-password) · [Backups](#backups) · [Using nginx instead of Caddy](#using-nginx-or-another-reverse-proxy) · [Web app on Cloudflare](#web-app-on-cloudflare) · [Scaling the scheduler](#running-the-scheduler-separately) · [Local development](#local-development) · [Testing on an iPhone during development](#testing-on-an-iphone-during-development) · [Checklist](#security-checklist)

## Requirements

- A Linux server with a public IP address. For personal use 1 vCPU and 1 GB of RAM is enough to run it; building the image on the server is more comfortable with 2 GB (or add swap).
- Docker Engine 24 or later with the Compose plugin (`docker compose version`).
- A domain where you can add DNS records.
- Ports 80 and 443 open to the internet (Caddy needs both to obtain and renew certificates).

HTTPS is not optional: service workers, installation and Web Push only work in a secure context, and iPhones only accept certificates from trusted authorities.

## 1. Point your subdomain at the server

At your DNS provider, create:

| Type   | Name   | Value                              |
| ------ | ------ | ---------------------------------- |
| `A`    | `prep` | your server's IPv4                 |
| `AAAA` | `prep` | your server's IPv6 (if it has one) |

Wait until `dig +short prep.example.com` returns the server's address before starting Caddy, otherwise certificate issuance fails (it retries automatically, but it's quicker to wait).

If your DNS provider proxies traffic (for example Cloudflare's orange cloud), either set the record to "DNS only" or use Cloudflare's own certificates and the nginx route below.

## 2. Configure

```bash
git clone https://github.com/<you>/buZZprep.git
cd buZZprep
cp .env.example .env
```

Edit `.env`:

| Variable              | Value                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `APP_DOMAIN`          | `prep.example.com`                                                                          |
| `PUBLIC_APP_URL`      | `https://prep.example.com`                                                                  |
| `SESSION_SECRET`      | Output of `openssl rand -base64 48`                                                         |
| `REGISTRATION_MODE`   | `invite` (recommended), `closed` or `open`; see below                                       |
| `INVITE_CODE`         | Output of `openssl rand -hex 16`                                                            |
| `MONGO_ROOT_PASSWORD` | Output of `openssl rand -hex 24` (hex only: the password is placed inside a connection URL) |
| `VAPID_*`             | Generated in the next step                                                                  |

**Who can register:**

- `invite`: everyone needs the invite code, including the first account. Recommended for any server on the internet: nobody can claim your server before you do.
- `closed`: only the very first account can be created; registration is closed after that.
- `open`: anyone who can reach the server can create an account. Accounts are fully isolated from each other, but only use this if you intend to host other people.

The first account on a new server becomes its owner (admin). After creating your account you can switch to `closed` and run `docker compose up -d` to apply it.

**Generate the Web Push keys** (once per deployment):

```bash
docker compose build
docker compose run --rm --no-deps app node apps/server/dist/generate-vapid.js
```

Copy the three printed lines into `.env` and set `VAPID_SUBJECT` to an email (`mailto:you@example.com`) or URL you control. If you have Node.js locally, `npx web-push generate-vapid-keys` produces equivalent keys.

Keep a copy of `.env` somewhere safe (a password manager). If you lose the VAPID keys, every device has to turn reminders on again.

**Journal AI (optional).** Voice logs and generated notes need an API key; leave the keys empty and the journal works without them (typed logs, your own notes, the weekly revision sheet).

| Variable            | Value                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `LLM_MODEL_API_KEY` | One key for everything: used by the service it belongs to (`gsk_…` Groq, `sk-ant-…` Anthropic, otherwise OpenAI).                        |
| `OPENAI_API_KEY`    | Speech-to-text for voice logs (`gpt-transcribe`), and notes if Anthropic has no key (`gpt-6.1-sol`).                                     |
| `ANTHROPIC_API_KEY` | Notes and weekly summaries (`claude-sonnet-5-5`; set `AI_NOTES_MODEL=claude-haiku-5-5` to spend less).                                   |
| `GROQ_API_KEY`      | Covers both on its own: `whisper-large-v3` for voice, `openai/gpt-oss-120b` for notes.                                                   |
| `AI_*_PROVIDER`     | `auto` (default) uses the first service with a key: voice OpenAI → Groq; notes Anthropic → OpenAI → Groq. Name one to pin it, or `none`. |
| `AI_DAILY_LIMIT`    | AI requests per person per day (default 40).                                                                                             |

The server log says which provider each feature uses, and warns if a key sits under the wrong name (for example a Groq `gsk_…` key in `OPENAI_API_KEY`). The other options, including the commented-out local providers (a Whisper server and Ollama), are described in `.env.example`. Keys stay on the server. Recordings are sent to the speech-to-text provider and deleted once transcribed; the app's journal settings show each person where their words go and let them switch AI off. Voice recording needs HTTPS, which the Caddy setup provides. If you use nginx, keep the larger upload limit for recordings from `deploy/nginx/buzzprep.conf`.

## 3. Start

```bash
docker compose up -d
docker compose ps                 # app and mongo should become "healthy"
docker compose logs -f app        # Ctrl+C to stop following
curl https://prep.example.com/api/health
```

The first start takes a minute while Caddy obtains the certificate. The app's port is bound to `127.0.0.1:4000` only; Caddy is the only public entry point, and MongoDB is not exposed at all.

## 4. Create your account

Open `https://prep.example.com`, choose **Create account**, and enter the invite code. Then follow the setup wizard: it asks about your goal, deadline, work hours, sleep, study time and reminders, and builds your plan. Everything can be changed later.

## 5. Load your personal setup (optional)

Instead of the wizard, you can import a ready-made config bundle (see [config/README.md](../config/README.md)). Your personal bundle is a file like `config/personal.local.json`; files ending in `.local.json` are ignored by git, so they never end up in a public repository.

Either import it in the app (**Profile → Import configuration**), or from the server:

```bash
# Copy the file to the server's config/ folder (mounted read-only into the container at /config):
scp config/personal.local.json server:~/buZZprep/config/

docker compose exec app node apps/server/dist/import-config.js \
  --email you@example.com --file /config/personal.local.json
```

`--mode replace` (default) replaces your routine, reminders and plan; `--mode merge` adds to them. Journal entries and history are never touched by an import.

## 6. Install on your phone

On iPhone: open the address in Safari → **•••** → **Share** → **Add to Home Screen**, open the app from the Home Screen, sign in, then **Profile → Notifications → Turn on reminders**. Full details and a real-device test plan: [NOTIFICATIONS.md](NOTIFICATIONS.md).

## Updating

```bash
cd buZZprep
git pull
docker compose up -d --build
docker image prune -f
```

Indexes are created at startup; there are no manual migrations so far. Read the release notes before upgrading across versions. Installed apps pick up the new version and show **Update** the next time they're opened.

## Forgotten password

There is no email-based reset (the server doesn't send email). Reset a password on the server instead; it prints a new random password once and signs that account out everywhere:

```bash
docker compose exec app node apps/server/dist/reset-password.js --email you@example.com
# local development: npm run password:reset -- --email you@example.com
```

Sign in with it, then choose a new one in **Profile → Change password**.

## Backups

Everything lives in MongoDB. Back it up with `mongodump`:

```bash
mkdir -p backups
docker compose exec -T mongo sh -c \
  'mongodump --quiet --archive --gzip -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db buzzprep' \
  > "backups/buzzprep-$(date +%F).archive.gz"
```

A daily cron job that keeps two weeks of backups (`crontab -e`, adjust the path):

```cron
30 3 * * * cd /home/you/buZZprep && docker compose exec -T mongo sh -c 'mongodump --quiet --archive --gzip -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db buzzprep' > "backups/buzzprep-$(date +\%F).archive.gz" && find backups -name 'buzzprep-*.archive.gz' -mtime +14 -delete
```

Restore (replaces the current data):

```bash
docker compose exec -T mongo sh -c \
  'mongorestore --quiet --archive --gzip --drop -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' \
  < backups/buzzprep-2026-11-16.archive.gz
```

Copy backups off the server (they contain your journal). Also keep `.env` backed up separately. Test a restore occasionally.

Each user can also download their own data from **Profile → Download all data**.

## Using nginx or another reverse proxy

1. Remove `caddy` from `COMPOSE_PROFILES` in `.env` (leave it empty), then `docker compose up -d`.
2. Use `deploy/nginx/buzzprep.conf` as a starting point: replace the domain, obtain a certificate (`sudo certbot --nginx -d prep.example.com`) and reload nginx.
3. The proxy must forward `Host` and `X-Forwarded-Proto`/`X-Forwarded-For`. The app trusts exactly one proxy hop (`TRUST_PROXY=1` in `docker-compose.yml`); change it if you chain proxies.

Traefik, HAProxy or a Cloudflare Tunnel work the same way: send HTTPS traffic for your subdomain to `127.0.0.1:4000`.

## Web app on Cloudflare

Cloudflare can host the web app while the server runs elsewhere. `wrangler.jsonc` in the repository root sets this up: Cloudflare serves the built app (`apps/web/dist`) with the headers in `apps/web/public/_headers`, and a small Worker (`apps/web/worker/index.ts`) forwards `/api/*` to your server.

The server itself can't run on Cloudflare Workers: it's a long-running Node.js process with a reminder scheduler, so it still needs a host from this guide (or a Cloudflare Tunnel to a computer that is always on). Until it's connected, every `/api` request gets `503` and the app says the server isn't connected yet.

1. In the Cloudflare dashboard, **Workers & Pages → Create → Import a repository**, pick this repository and keep the build command `npm run build` and the deploy command `npx wrangler deploy`. The Worker's name must match `name` in `wrangler.jsonc` (`buzzprep`). Every push to the production branch deploys again.
2. Add your subdomain: the Worker's **Settings → Domains & Routes → Add → Custom Domain**, for example `prep.example.com`. Cloudflare creates the DNS record and the certificate. Don't list routes in `wrangler.jsonc`: routes there replace the dashboard's on every deploy.
3. Run the server at an address of its own, for example `prep-api.example.com` (steps 1–3 above, with that address as `APP_DOMAIN`), and set `PUBLIC_APP_URL` to the web app's address, `https://prep.example.com`: the server accepts requests whose `Origin` matches it and builds notification links from it.
4. Connect the two: the Worker's **Settings → Variables and Secrets → Add**, name `API_ORIGIN`, value `https://prep-api.example.com`. `keep_vars` in `wrangler.jsonc` keeps it across deploys.

To try the Cloudflare setup locally: `npm run build`, then `npx wrangler dev` serves the app on `http://localhost:8787` (add `--var API_ORIGIN:http://localhost:4000` to reach a local server).

## Running the scheduler separately

By default one container runs both the API and the reminder scheduler (`APP_ROLE=all`). To scale the API independently, add a second service with `APP_ROLE=worker` and set the main one to `APP_ROLE=api`:

```yaml
# docker-compose.override.yml
services:
  app:
    environment:
      APP_ROLE: api
  worker:
    image: buzzprep:latest
    restart: unless-stopped
    env_file: .env
    environment:
      NODE_ENV: production
      APP_ROLE: worker
      MONGODB_URI: mongodb://${MONGO_ROOT_USER:-buzzprep}:${MONGO_ROOT_PASSWORD}@mongo:27017/buzzprep?authSource=admin
    depends_on:
      mongo:
        condition: service_healthy
```

Reminders are claimed atomically, so running more than one worker never double-sends.

## Local development

Requirements: Node.js 22.12+ (24 recommended) and Docker (for MongoDB).

```bash
npm install
npm run dev:db             # MongoDB on 127.0.0.1:27017
npm run dev                # API on http://localhost:4000, app on http://localhost:5173
```

No `.env` file is needed on your computer: the defaults already point at the local MongoDB and `http://localhost:5173`, allow open registration and use a development session secret. Don't copy `.env.example` for local use; it holds production settings.

To try notifications locally, run `npm run vapid:generate` and save the three `VAPID_…` lines it prints in a new `.env` file in the project folder, then restart `npm run dev`. Chrome and Firefox allow service workers and push on `http://localhost`, so this works without HTTPS.

To try the journal's voice logs and notes locally, add `OPENAI_API_KEY=…` and `ANTHROPIC_API_KEY=…` to the same `.env` file and restart `npm run dev`; the server log says which AI features are on. Browsers allow the microphone on `http://localhost`, but not on a plain-HTTP address such as your laptop's IP from a phone.

Other useful commands:

```bash
npm run dev -w @buzzprep/server   # API only
npm run dev:db:down               # stop the local MongoDB (data is kept)
npm test                          # all unit tests
MONGODB_TEST_URI=mongodb://127.0.0.1:27017/buzzprep_test npm test   # + API integration tests
npm run typecheck
npm run lint
```

To run the production build on your computer (one process serving the API and the app on port 4000):

```bash
npm run build
WEB_DIST_DIR=../web/dist PUBLIC_APP_URL=http://localhost:4000 npm start
```

## Testing on an iPhone during development

An iPhone needs a trusted HTTPS address. The simplest options:

- **A staging subdomain** (for example `prep-dev.example.com`) deployed with this guide.
- **A tunnel** to your laptop, such as Cloudflare Tunnel or ngrok. Run the production build as above, with `PUBLIC_APP_URL` set to the tunnel's `https://` address, and point the tunnel at `http://localhost:4000`. Use a fixed tunnel hostname: push subscriptions belong to one origin, so a new random hostname means reinstalling the app.

Self-signed certificates don't work for installed web apps unless you install and fully trust your own certificate authority on the phone.

## Security checklist

- [ ] `.env` has a unique `SESSION_SECRET`, `MONGO_ROOT_PASSWORD` and `INVITE_CODE`, and is not committed anywhere.
- [ ] `REGISTRATION_MODE` is `invite` or `closed`.
- [ ] Only ports 22, 80 and 443 are open (for example `ufw allow OpenSSH && ufw allow 80,443/tcp && ufw enable`). Note that Docker-published ports bypass ufw, which is why the app is bound to `127.0.0.1` and MongoDB isn't published.
- [ ] SSH uses keys, not passwords.
- [ ] Automatic security updates are on for the host (`unattended-upgrades` on Debian/Ubuntu).
- [ ] Backups run daily, are copied off the server, and a restore has been tested.
- [ ] The server clock is synchronised (`timedatectl` shows "System clock synchronized: yes").
