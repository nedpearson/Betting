/**
 * Helper to proxy requests to the authoritative Python backend (BOI)
 * when running locally or deployed on a persistent container.
 */

export const BACKEND_URL = process.env.BOI_BACKEND_URL || process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export async function tryProxyToBackend(path: string, options: RequestInit = {}): Promise<{ proxied: boolean; data?: any; status?: number }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1200);

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
        return { proxied: true, data, status: resp.status };
      }
    }
    return { proxied: false };
  } catch {
    return { proxied: false };
  }
}
