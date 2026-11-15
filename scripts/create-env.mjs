#!/usr/bin/env node
// Creates the server's .env for a production deployment, with fresh secrets.
//
//   node scripts/create-env.mjs --url https://prep.example.com [--file .env] [--force]
//
// It generates SESSION_SECRET, INVITE_CODE and the Web Push (VAPID) keys, and asks for the
// MongoDB connection string, an optional AI key and an optional Cloudflare Tunnel token. Typed
// values are masked, so they never show on screen, in a chat or in your shell history.
// Needs only Node.js, no npm install. Without Node on the machine, run it in a container:
//   docker run --rm -it -u "$(id -u):$(id -g)" -v "$PWD":/app -w /app node:24-alpine \
//     node scripts/create-env.mjs --url https://prep.example.com
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    url: { type: 'string' },
    file: { type: 'string', default: '.env' },
    force: { type: 'boolean', default: false },
  },
});

if (existsSync(args.file) && !args.force) {
  console.error(`${args.file} already exists. Rename it first, or pass --force to replace it.`);
  process.exit(1);
}

let pending = ''; // typed or piped input not used yet
let ended = false;

/** Reads one line from the terminal; `hidden` echoes * instead of the characters. */
function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const { stdin } = process;
    const tty = stdin.isTTY;
    let value = '';
    const finish = () => {
      stdin.off('data', onData);
      stdin.off('end', onEnd);
      if (tty) stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
      resolve(value.trim());
    };
    const consume = () => {
      while (pending) {
        const ch = pending[0];
        pending = pending.slice(1);
        if (ch === '\r' || ch === '\n') {
          if (ch === '\r' && pending[0] === '\n') pending = pending.slice(1);
          finish();
          return true;
        }
        if (ch === '\u0003') {
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u001b') {
          pending = pending.replace(/^\[[0-9;]*[A-Za-z~]/, ''); // arrow keys and the like
          continue;
        }
        if (ch === '\u007f' || ch === '\b') {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (ch < ' ') continue;
        value += ch;
        process.stdout.write(hidden ? '*' : ch);
      }
      return false;
    };
    const onData = (chunk) => {
      pending += chunk;
      consume();
    };
    const onEnd = () => {
      ended = true;
      finish();
    };
    if (consume()) return;
    if (ended) return finish();
    if (tty) stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
    stdin.on('end', onEnd);
    stdin.resume();
  });
}

async function askUntil(question, check, options) {
  for (;;) {
    const answer = await ask(question, options);
    const problem = check(answer);
    if (!problem) return answer;
    console.error(`  ${problem}`);
    if (ended) process.exit(1);
  }
}

/** A Web Push key pair in the format web-push uses (base64url, uncompressed public key). */
function vapidKeys() {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pub = publicKey.export({ format: 'jwk' });
  const priv = privateKey.export({ format: 'jwk' });
  const raw = Buffer.concat([
    Buffer.from([4]),
    Buffer.from(pub.x, 'base64url'),
    Buffer.from(pub.y, 'base64url'),
  ]);
  return { publicKey: raw.toString('base64url'), privateKey: priv.d };
}

const appUrl = new URL(
  args.url ??
    (await askUntil('Web app address (https://…): ', (v) =>
      /^https:\/\/[^/\s]+/.test(v) ? '' : 'Enter the full https:// address.',
    )),
).origin;

console.log(
  '\nMongoDB connection string: in Atlas, Connect › Drivers, with your password filled in.',
);
const mongoUri = await askUntil(
  'MONGODB_URI (hidden): ',
  (v) =>
    !/^mongodb(\+srv)?:\/\//.test(v)
      ? 'It starts with mongodb+srv:// or mongodb://.'
      : /<password>|<db_password>/.test(v)
        ? 'Replace <password> with the real password.'
        : '',
  { hidden: true },
);

console.log(
  '\nAI key for the journal (gsk_… Groq, sk-ant-… Anthropic, sk-… OpenAI). Enter to skip.',
);
const aiKey = await ask('AI key (hidden): ', { hidden: true });
const aiVar = aiKey.startsWith('gsk_')
  ? 'GROQ_API_KEY'
  : aiKey.startsWith('sk-ant-')
    ? 'ANTHROPIC_API_KEY'
    : 'OPENAI_API_KEY';
const ai = { LLM_MODEL_API_KEY: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', GROQ_API_KEY: '' };
if (aiKey) ai[aiVar] = aiKey;

console.log(
  '\nCloudflare Tunnel token, for docker-compose.tunnel.yml: paste the Docker command from',
  'Cloudflare (Tunnels › your tunnel), or just its eyJ… token. Enter to skip.',
);
const TOKEN = /eyJ[A-Za-z0-9+/=_-]{40,}/;
const tunnelToken =
  (
    await askUntil(
      'TUNNEL_TOKEN (hidden): ',
      (v) => (!v || TOKEN.test(v) ? '' : 'No token found. Paste the command or the eyJ… token.'),
      { hidden: true },
    )
  ).match(TOKEN)?.[0] ?? '';

const vapid = vapidKeys();
const lines = [
  `# buZZprep server settings, created by scripts/create-env.mjs on ${new Date().toISOString().slice(0, 10)}.`,
  '# Private: never commit or share this file. Keep a copy in a password manager (losing the',
  '# VAPID keys means turning reminders on again on every device).',
  '',
  'NODE_ENV=production',
  `PUBLIC_APP_URL=${appUrl}`,
  `SESSION_SECRET=${randomBytes(48).toString('base64')}`,
  'REGISTRATION_MODE=invite',
  `INVITE_CODE=${randomBytes(16).toString('hex')}`,
  `MONGODB_URI=${mongoUri}`,
  `VAPID_PUBLIC_KEY=${vapid.publicKey}`,
  `VAPID_PRIVATE_KEY=${vapid.privateKey}`,
  `VAPID_SUBJECT=${appUrl}`,
  ...Object.entries(ai).map(([k, v]) => `${k}=${v}`),
  ...(tunnelToken ? [`TUNNEL_TOKEN=${tunnelToken}`] : []),
  '',
];
writeFileSync(args.file, lines.join('\n'), { mode: 0o600 });

console.log(`\nCreated ${args.file} for ${appUrl}.`);
console.log(
  `AI: ${aiKey ? aiVar : 'off (no key)'}. Web Push: on. Sign-up: invite only.` +
    ` Tunnel: ${tunnelToken ? 'set' : 'not set'}.`,
);
console.log(`Your invite code is the INVITE_CODE line in ${args.file}.`);
