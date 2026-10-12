const API_BASE = import.meta.env.VITE_API_URL ?? '';
const BASE_DOMAIN = import.meta.env.VITE_BASE_DOMAIN || 'localhost';
const RESERVED_SLUGS = new Set(['www', 'admin', 'api']);

const TENANT_TOKEN_KEY = 'zookahq_tenant_token';

export function getBaseDomain(): string {
  return BASE_DOMAIN;
}

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1';
}

function getTenantSlug(): string | null {
  const host = window.location.hostname;
  if (isLoopbackHost(host) || host === BASE_DOMAIN || host === `admin.${BASE_DOMAIN}`) {
    return null;
  }

  if (host.endsWith(`.${BASE_DOMAIN}`)) {
    const slug = host.slice(0, -(BASE_DOMAIN.length + 1));
    if (slug && !slug.includes('.') && !RESERVED_SLUGS.has(slug)) {
      return slug;
    }
    return null;
  }

  const parts = host.split('.');
  if (parts.length >= 2 && !RESERVED_SLUGS.has(parts[0])) {
    return parts[0];
  }
  return null;
}

export function isPlatformHost(): boolean {
  const host = window.location.hostname;
  return isLoopbackHost(host) || host === BASE_DOMAIN || host === `admin.${BASE_DOMAIN}`;
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
