/**
 * Generates a VAPID key pair for Web Push.
 *
 *   node apps/dashboard/scripts/generate-vapid-keys.mjs
 *
 * The public key is safe to keep in wrangler vars; the private key is a secret
 * and belongs in `wrangler secret put VAPID_PRIVATE_KEY`.
 */
import { webcrypto } from 'node:crypto';

const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify'],
);

const raw = new Uint8Array(await webcrypto.subtle.exportKey('raw', publicKey));
const jwk = await webcrypto.subtle.exportKey('jwk', privateKey);

const base64url = (bytes) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

console.log(`VITE_VAPID_PUBLIC_KEY=${base64url(raw)}`);
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`);
console.log('VAPID_SUBJECT=mailto:you@yourdomain.com');
console.log('\nPublic key goes in wrangler vars; the private key is a Worker secret.');
