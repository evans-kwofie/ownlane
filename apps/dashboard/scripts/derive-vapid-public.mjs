/**
 * Recovers the VAPID public key from its private key.
 *
 *   node apps/dashboard/scripts/derive-vapid-public.mjs <VAPID_PRIVATE_KEY>
 *
 * The pair is not two independent values: the public key is the private scalar
 * multiplied by the curve's generator point, so it can always be recomputed —
 * but only from the private half, never the other way round.
 *
 * Useful when the public key is lost after being written to a Worker secret,
 * since a secret cannot be read back.
 */
import { createECDH } from 'node:crypto';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node derive-vapid-public.mjs <VAPID_PRIVATE_KEY>');
  process.exit(1);
}

const toBytes = (value) =>
  Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const priv = toBytes(input);
if (priv.length !== 32) {
  console.error(`Expected a 32-byte private scalar; got ${priv.length} bytes.`);
  process.exit(1);
}

const curve = createECDH('prime256v1');
curve.setPrivateKey(priv);

const base64url = (bytes) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

console.log(`VITE_VAPID_PUBLIC_KEY=${base64url(curve.getPublicKey())}`);
