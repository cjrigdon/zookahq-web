import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { isPlatformHost } from '../../api/client';

type NavItem = { to: string; label: string; end?: boolean };
type NavGroup = {
  id: string;
  label: string;
  to?: string;
  module?: string;
  admin?: boolean;
  children?: NavItem[];
};

const platformGroups: NavGroup[] = [
  {
    id: 'platform',
    label: 'Platform',
    children: [
      { to: '/tenants', label: 'Tenants' },
      { to: '/modules', label: 'Modules' },
    ],
  },
];

const tenantGroups: NavGroup[] = [
  { id: 'dashboard', label: 'Dashboard', to: '/' },
  {
    id: 'booking',
    label: 'Booking',
    module: 'booking',
    to: '/booking/leads',
    children: [
      { to: '/booking/leads', label: 'Leads' },
      { to: '/booking/accounts', label: 'Accounts' },
      { to: '/booking/opportunities', label: 'Opportunities' },
      { to: '/booking/proposals', label: 'Proposals' },
      { to: '/booking/contracts', label: 'Contracts' },
      { to: '/booking/sales-goals', label: 'Sales goals' },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    module: 'events',
    to: '/events/calendar',
    children: [
      { to: '/events/calendar', label: 'Calendar' },
      { to: '/events/events', label: 'Events' },
      { to: '/events/functions', label: 'Functions' },
      { to: '/events/service-orders', label: 'Service orders' },
      { to: '/events/changes', label: 'Change log' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    module: 'operations',
    to: '/operations/work-orders',
  },
  {
    id: 'accounting',
    label: 'Accounting',
    module: 'accounting',
    to: '/accounting',
    children: [
      { to: '/accounting', label: 'Overview', end: true },
      { to: '/accounting/ar-invoices', label: 'AR invoices' },
      { to: '/accounting/ar-payments', label: 'AR payments' },
      { to: '/accounting/ap-bills', label: 'AP bills' },
      { to: '/accounting/ap-payments', label: 'AP payments' },
      { to: '/accounting/inventory', label: 'Inventory' },
      { to: '/accounting/budgets', label: 'Budgets' },
      { to: '/accounting/gl', label: 'General ledger' },
      { to: '/accounting/reports', label: 'Reports' },
    ],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    module: 'reporting',
    to: '/reporting',
    children: [
      { to: '/reporting', label: 'Overview', end: true },
      { to: '/reporting/library', label: 'Library' },
      { to: '/reporting/builder', label: 'Builder' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    admin: true,
    to: '/admin/users',
    children: [
      { to: '/admin/users', label: 'Users' },
      { to: '/admin/settings', label: 'Settings' },
    ],
  },
];

function pathMatches(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function groupIsActive(pathname: string, group: NavGroup) {
  if (group.to && pathMatches(pathname, group.to, group.id === 'dashboard')) {
    return true;
  }
  return (group.children ?? []).some((child) => pathMatches(pathname, child.to, child.end));
}

export function AppShell() {
  const { user, logout, tenant, roles, hasModule } = useAuth();
  const platform = isPlatformHost();
  const isTenantAdmin = roles.includes('tenant_admin');
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const source = platform ? platformGroups : tenantGroups;
    return source.filter((group) => {
      if (group.module && !hasModule(group.module)) return false;
      if (group.admin && !isTenantAdmin) return false;
      return true;
    });
  }, [platform, hasModule, isTenantAdmin]);

  const activeGroupId = useMemo(
    () => groups.find((group) => groupIsActive(pathname, group))?.id ?? null,
    [groups, pathname],
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroups((prev) => ({ ...prev, [activeGroupId]: true }));
  }, [activeGroupId]);

  const expandGroup = (group: NavGroup) => {
    setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
    const first = group.children?.[0];
    if (first && !pathMatches(pathname, first.to, first.end)) {
      navigate(first.to);
    }
  };

  const toggleGroup = (group: NavGroup) => {
    const isOpen = Boolean(openGroups[group.id]);
    if (isOpen) {
      setOpenGroups((prev) => ({ ...prev, [group.id]: false }));
      return;
    }
    expandGroup(group);
  };

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 flex-col bg-primary text-white">
        <div className="border-b border-white/10 px-5 py-6">
          <div className="flex items-center gap-2.5">
            <img src="/zooka-logo.png" alt="" className="h-9 w-9 shrink-0" />
            <div className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
              ZookaHQ
            </div>
          </div>
          <p className="mt-2 text-xs text-white/70">
            {platform ? 'Platform Admin' : tenant?.name ?? 'Tenant'}
          </p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => {
            const hasChildren = (group.children?.length ?? 0) > 0;
            const isOpen = hasChildren ? Boolean(openGroups[group.id]) : false;
            const parentActive = groupIsActive(pathname, group);

            if (!hasChildren && group.to) {
              return (
                <NavLink
                  key={group.id}
                  to={group.to}
                  end={group.id === 'dashboard'}
                  className={({ isActive }) =>
                    [
                      'block rounded-md px-3 py-2 text-sm transition',
                      isActive
                        ? 'bg-support font-medium text-primary'
                        : 'text-white/85 hover:bg-white/10',
                    ].join(' ')
                  }
                >
                  {group.label}
                </NavLink>
              );
            }

            return (
              <div key={group.id} className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => expandGroup(group)}
                    className={[
                      'min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm transition',
                      parentActive && !isOpen
                        ? 'bg-white/15 font-medium text-white'
                        : 'text-white/90 hover:bg-white/10',
                    ].join(' ')}
                  >
                    {group.label}
                  </button>
                  <button
                    type="button"
                    aria-label={isOpen ? `Collapse ${group.label}` : `Expand ${group.label}`}
                    onClick={() => toggleGroup(group)}
                    className="rounded-md px-2 py-2 text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <span
                      className={[
                        'inline-block text-[10px] leading-none transition-transform',
                        isOpen ? 'rotate-90' : '',
                      ].join(' ')}
                    >
                      ▸
                    </span>
                  </button>
                </div>
                {isOpen && (
                  <div className="ml-2 space-y-0.5 border-l border-white/15 pl-2">
                    {group.children!.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end={Boolean(child.end)}
                        className={({ isActive }) =>
                          [
                            'block rounded-md px-3 py-1.5 text-[13px] transition',
                            isActive
                              ? 'bg-support font-medium text-primary'
                              : 'text-white/75 hover:bg-white/10 hover:text-white',
                          ].join(' ')
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-4 text-sm">
          <div className="truncate text-white/90">{user?.name}</div>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-2 text-xs text-accent hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-primary px-8 py-4 text-white">
          <h1 className="font-[family-name:var(--font-display)] text-xl">
            {platform ? 'SaaS Control Plane' : 'Venue CRM'}
          </h1>
        </header>
        <main className="flex-1 overflow-auto bg-canvas p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
