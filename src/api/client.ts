const API_BASE = import.meta.env.VITE_API_URL ?? '';

const TENANT_TOKEN_KEY = 'zookahq_tenant_token';

function getTenantSlug(): string | null {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === 'admin.localhost') {
    return null;
  }
  const parts = host.split('.');
  if (parts.length >= 2 && parts[0] !== 'www') {
    return parts[0];
  }
  return null;
}

export function isPlatformHost(): boolean {
  const host = window.location.hostname;
  return host === 'admin.localhost' || host === 'localhost' || host === '127.0.0.1';
}

export function getCurrentTenantSlug(): string | null {
  return getTenantSlug();
}

export function getTenantToken(): string | null {
  return localStorage.getItem(TENANT_TOKEN_KEY);
}

export function setTenantToken(token: string | null) {
  if (token) localStorage.setItem(TENANT_TOKEN_KEY, token);
  else localStorage.removeItem(TENANT_TOKEN_KEY);
}

async function ensureCsrf(): Promise<void> {
  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: 'include',
  });
}

function xsrfToken(): string | null {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');

  const tenant = getTenantSlug();
  if (tenant) {
    headers.set('X-Tenant', tenant);
    const token = getTenantToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const xsrf = xsrfToken();
  if (xsrf) {
    headers.set('X-XSRF-TOKEN', xsrf);
  }

  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload.message ||
      payload.email?.[0] ||
      (Object.values(payload.errors ?? {}) as string[][])?.[0]?.[0] ||
      'Request failed';
    throw new Error(message);
  }

  return payload as T;
}

export async function loginRequest(
  path: string,
  email: string,
  password: string,
) {
  await ensureCsrf();
  return api(path, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export { ensureCsrf };
