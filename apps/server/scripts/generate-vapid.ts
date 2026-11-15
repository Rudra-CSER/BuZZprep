// Generates a VAPID key pair for Web Push. Run once per deployment and keep the private key secret.
import { generateVAPIDKeys } from 'web-push';

const { publicKey, privateKey } = generateVAPIDKeys();
console.log(`# Web Push (VAPID) keys — add to your .env file.
# The private key is a secret: never commit it or expose it to the browser.
# Changing keys later invalidates every existing push subscription.
VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_SUBJECT=mailto:you@example.com`);
