import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  ensureCsrf,
  isPlatformHost,
  loginRequest,
  setTenantToken,
} from '../api/client';

type AuthUser = {
  id: number;
  name: string;
  email: string;
};

type AuthState = {
  user: AuthUser | null;
  type: 'platform' | 'tenant' | null;
  permissions: string[];
  roles: string[];
  modules: string[];
  tenant: { id: string; name: string; slug: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (permission: string) => boolean;
  hasModule: (code: string) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [type, setType] = useState<'platform' | 'tenant' | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [tenant, setTenant] = useState<AuthState['tenant']>(null);
  const [loading, setLoading] = useState(true);

  const applyPayload = useCallback((payload: any) => {
    setUser(payload.user ?? null);
    setType(payload.type ?? null);
    setPermissions(payload.permissions ?? []);
    setRoles(payload.roles ?? []);
    setModules(payload.modules ?? []);
    setTenant(payload.tenant ?? null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await ensureCsrf();
      if (isPlatformHost()) {
        const payload = await api<any>('/platform/auth/me');
        applyPayload(payload);
      } else {
        const payload = await api<any>('/auth/me');
        applyPayload(payload);
      }
    } catch {
      setUser(null);
      setType(null);
      setPermissions([]);
      setRoles([]);
      setModules([]);
      setTenant(null);
      if (!isPlatformHost()) setTenantToken(null);
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const path = isPlatformHost() ? '/platform/auth/login' : '/auth/login';
      const payload = await loginRequest(path, email, password);
      if (!isPlatformHost() && (payload as any).token) {
        setTenantToken((payload as any).token);
      }
      applyPayload(payload);
      if (!isPlatformHost()) {
        await refresh();
      }
    },
    [applyPayload, refresh],
  );

  const logout = useCallback(async () => {
    const path = isPlatformHost() ? '/platform/auth/logout' : '/auth/logout';
    try {
      await api(path, { method: 'POST' });
    } finally {
      if (!isPlatformHost()) setTenantToken(null);
      setUser(null);
      setType(null);
      setPermissions([]);
      setRoles([]);
      setModules([]);
      setTenant(null);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      type,
      permissions,
      roles,
      modules,
      tenant,
      loading,
      login,
      logout,
      refresh,
      can: (permission: string) => permissions.includes(permission),
      hasModule: (code: string) => modules.includes(code),
    }),
    [user, type, permissions, roles, modules, tenant, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
