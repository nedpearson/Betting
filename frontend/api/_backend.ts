/**
 * Helper to proxy requests to the authoritative Python backend (BOI)
 * when running locally or deployed on a persistent container.
 */

const configuredUrl = process.env.BOI_BACKEND_URL || process.env.VITE_BACKEND_URL;
const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const isProd = process.env.NODE_ENV === 'production';

// Only mark configured if an explicit backend URL was provided, or in non-Vercel local dev
export const IS_BACKEND_CONFIGURED = Boolean(configuredUrl || (!isVercel && !isProd));
export const BACKEND_URL = configuredUrl || 'http://127.0.0.1:8000';

export interface BackendProxyResult {
  proxied: boolean;
  configured: boolean;
  data?: any;
  status?: number;
  error?: string;
}

export async function tryProxyToBackend(path: string, options: RequestInit = {}): Promise<BackendProxyResult> {
  if (!IS_BACKEND_CONFIGURED) {
    return { proxied: false, configured: false };
  }

  try {
    const controller = new AbortController();
    const timeoutMs = options.method === 'POST' ? 3000 : 1500;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${BACKEND_URL}${cleanPath}`;

    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json().catch(() => null);
      if (data !== null) {
        return { proxied: true, configured: true, data, status: resp.status };
      }
    }

    const errDetail = await resp.text().catch(() => resp.statusText);
    return {
      proxied: false,
      configured: true,
      status: resp.status,
      error: `Backend responded with HTTP ${resp.status}: ${errDetail.slice(0, 300)}`,
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      proxied: false,
      configured: true,
      status: 504,
      error: isTimeout ? 'Authoritative backend timed out' : `Authoritative backend unreachable: ${err?.message || 'Connection failed'}`,
    };
  }
}
