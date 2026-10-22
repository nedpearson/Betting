/**
 * Authoritative, Cryptographic Kalshi Client for Vercel Serverless Functions.
 *
 * Implements strict Ed25519 signing per official Kalshi Trade API v2 specifications.
 * ZERO mocked responses, ZERO synthetic order IDs, ZERO hardcoded balances.
 */

import crypto from 'crypto';

export interface KalshiCredentials {
  keyId: string;
  privateKeyPem: string;
}

export function getKalshiCredentials(req?: any): KalshiCredentials | null {
  const envKeyId = process.env.KALSHI_KEY_ID || process.env.BOI_KALSHI_KEY_ID;
  const envPrivKey = process.env.KALSHI_PRIVATE_KEY || process.env.BOI_KALSHI_PRIVATE_KEY;

  const headerKeyId = req?.headers?.['x-kalshi-key-id'] as string;
  const headerPrivKey = req?.headers?.['x-kalshi-private-key'] as string;

  const bodyKeyId = req?.body?.key_id;
  const bodyPrivKey = req?.body?.private_key;

  const keyId = (headerKeyId || bodyKeyId || envKeyId || '').trim();
  let privKey = (headerPrivKey || bodyPrivKey || envPrivKey || '').trim();

  if (!keyId || !privKey) {
    return null;
  }

  // Handle single-line or un-wrapped PEM keys
  if (!privKey.includes('-----BEGIN PRIVATE KEY-----')) {
    privKey = `-----BEGIN PRIVATE KEY-----\n${privKey}\n-----END PRIVATE KEY-----`;
  }

  return { keyId, privateKeyPem: privKey };
}

export function signKalshiHeaders(
  method: string,
  path: string,
  keyId: string,
  privateKeyPem: string
): Record<string, string> {
  const timestamp = Date.now().toString();
  const cleanPath = path.startsWith('/trade-api/v2') ? path : `/trade-api/v2${path}`;
  const msg = Buffer.from(timestamp + method.toUpperCase() + cleanPath);

  try {
    const key = crypto.createPrivateKey(privateKeyPem);
    const sig = crypto.sign(null, msg, key).toString('base64');

    return {
      'Content-Type': 'application/json',
      'KALSHI-ACCESS-KEY': keyId,
      'KALSHI-ACCESS-SIGNATURE': sig,
      'KALSHI-ACCESS-TIMESTAMP': timestamp,
    };
  } catch (err: any) {
    throw new Error(`Ed25519 signature error: ${err.message}`);
  }
}

export async function kalshiRequest(
  method: string,
  endpoint: string,
  body?: any,
  creds?: KalshiCredentials | null
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `https://api.elections.kalshi.com/trade-api/v2${cleanEndpoint}`;

  let headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (creds) {
    const signed = signKalshiHeaders(method, `/trade-api/v2${cleanEndpoint}`, creds.keyId, creds.privateKeyPem);
    headers = { ...headers, ...signed };
  }

  try {
    const resp = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const errMsg = typeof data.error === 'object' ? (data.error?.message || JSON.stringify(data.error)) : (data.error || data.message);
      return {
        ok: false,
        status: resp.status,
        data,
        error: errMsg || `Kalshi HTTP ${resp.status}`,
      };
    }

    return { ok: true, status: resp.status, data };
  } catch (err: any) {
    return { ok: false, status: 500, error: `Network/Gateway error: ${err.message}` };
  }
}
