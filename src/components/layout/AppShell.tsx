import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { isPlatformHost } from '../../api/client';
import { NotificationBell } from './NotificationBell';
import {
  ChevronGlyphIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LogoutIcon,
  NavItemIcon,
  UserIcon,
} from './navIcons';

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
    to: '/booking/accounts',
    children: [
      { to: '/booking/accounts', label: 'Accounts' },
      { to: '/booking/leads', label: 'Leads' },
      { to: '/booking/sales-goals', label: 'Sales goals' },
    ],
  },
  {
    id: 'events',
    label: 'Events',
    module: 'events',
    to: '/events/events',
    children: [
      { to: '/events/events', label: 'Events' },
      { to: '/events/functions', label: 'Functions' },
      { to: '/events/service-orders', label: 'Service Orders' },
      { to: '/events/changes', label: 'Change Log' },
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
      { to: '/admin/checklists', label: 'Checklists' },
      { to: '/admin/documents', label: 'Documents' },
      { to: '/admin/spaces', label: 'Spaces' },
      { to: '/admin/event-types', label: 'Event types' },
      { to: '/admin/lead-form', label: 'Lead form' },
      { to: '/admin/settings', label: 'Settings' },
    ],
  },
];

const NAV_COLLAPSED_KEY = 'zookahq.navCollapsed';

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

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function userInitials(name?: string | null) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return letters.toUpperCase();
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

  const [openGroupId, setOpenGroupId] = useState<string | null>(activeGroupId);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroupId(activeGroupId);
  }, [activeGroupId]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [userMenuOpen]);

  const setCollapsedAndStore = (next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem(NAV_COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  const expandGroup = (group: NavGroup) => {
    setOpenGroupId(group.id);
    const first = group.children?.[0];
    if (first && !pathMatches(pathname, first.to, first.end)) {
      navigate(first.to);
    }
  };

  const toggleGroup = (group: NavGroup) => {
    if (openGroupId === group.id) {
      setOpenGroupId(null);
      return;
    }
    expandGroup(group);
  };

  const onParentClick = (group: NavGroup) => {
    if (collapsed) {
      setCollapsedAndStore(false);
    }
    expandGroup(group);
  };

  return (
    <div className="relative flex h-screen overflow-hidden">
      <aside
        className={[
          'flex h-full shrink-0 flex-col border-r border-chrome-border bg-primary text-white transition-[width] duration-200',
          collapsed ? 'w-20' : 'w-60',
        ].join(' ')}
      >
        <div
          className={[
            'flex h-[72px] shrink-0 items-center bg-primary-deep',
            collapsed ? 'justify-center px-2' : 'gap-2.5 px-3',
          ].join(' ')}
        >
          <img src="/zooka-logo.png" alt="" width={50} height={50} className="h-10 w-10 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-[family-name:var(--font-display)] text-2xl leading-none tracking-tight">
                ZookaHQ
              </div>
              <p className="mt-1 truncate text-xs text-white/70">
                {platform ? 'Platform Admin' : tenant?.name ?? 'Tenant'}
              </p>
            </div>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
          {groups.map((group) => {
            const hasChildren = (group.children?.length ?? 0) > 0;
            const isOpen = !collapsed && hasChildren && openGroupId === group.id;
            const parentActive = groupIsActive(pathname, group);
            const itemClass = (isActive: boolean) =>
              [
                'flex w-full items-center rounded-md text-[14px] transition',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-2.5 py-2',
                isActive
                  ? 'bg-support font-medium text-primary'
                  : 'text-white/85 hover:bg-white/10 hover:text-white',
              ].join(' ');

            if (!hasChildren && group.to) {
              return (
                <NavLink
                  key={group.id}
                  to={group.to}
                  end={group.id === 'dashboard'}
                  title={group.label}
                  className={({ isActive }) => itemClass(isActive)}
                >
                  <NavItemIcon id={group.id} />
                  {!collapsed && <span className="truncate">{group.label}</span>}
                </NavLink>
              );
            }

            return (
              <div key={group.id} className="space-y-0.5">
                <div
                  className={[
                    'flex items-center rounded-md text-[14px] transition',
                    parentActive && !isOpen
                      ? 'bg-support font-medium text-primary'
                      : 'text-white/85 hover:bg-white/10 hover:text-white',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    title={group.label}
                    onClick={() => onParentClick(group)}
                    className={[
                      'flex min-w-0 flex-1 items-center',
                      collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-2.5 py-2 text-left',
                    ].join(' ')}
                  >
                    <NavItemIcon id={group.id} />
                    {!collapsed && <span className="truncate">{group.label}</span>}
                  </button>
                  {!collapsed && (
                    <button
                      type="button"
                      aria-label={isOpen ? `Collapse ${group.label}` : `Expand ${group.label}`}
                      onClick={() => toggleGroup(group)}
                      className="px-2 py-2"
                    >
                      <ChevronGlyphIcon
                        className={[
                          'h-4 w-4 transition-transform',
                          isOpen ? 'rotate-90' : '',
                        ].join(' ')}
                      />
                    </button>
                  )}
                </div>
                {isOpen && (
                  <div className="ml-4 space-y-0.5 border-l border-white/15 pl-2">
                    {group.children!.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        end={Boolean(child.end)}
                        className={({ isActive }) =>
                          [
                            'block rounded-md px-3 py-1.5 text-[14px] transition',
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
        <div
          className={['relative border-t border-white/10', collapsed ? 'p-2' : 'p-3'].join(' ')}
          ref={userMenuRef}
        >
          <button
            type="button"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            title={user?.name ?? 'Account'}
            onClick={() => setUserMenuOpen((open) => !open)}
            className={[
              'flex w-full items-center rounded-md hover:bg-white/10',
              collapsed ? 'justify-center p-1.5' : 'gap-2 px-1.5 py-1.5',
            ].join(' ')}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-deep text-xs font-medium">
              {userInitials(user?.name)}
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-left text-sm text-white/90">
                  {user?.name}
                </span>
                <ChevronGlyphIcon
                  className={[
                    'h-4 w-4 shrink-0 text-white/70 transition-transform',
                    userMenuOpen ? '-rotate-90' : 'rotate-90',
                  ].join(' ')}
                />
              </>
            )}
          </button>
          {userMenuOpen && (
            <div
              role="menu"
              className={[
                'absolute z-40 w-44 rounded-md border border-chrome-border bg-white py-1 text-text shadow-lg',
                collapsed ? 'bottom-2 left-full ml-1' : 'bottom-full left-3 right-3 mb-1 w-auto',
              ].join(' ')}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/profile');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <UserIcon className="h-4 w-4" />
                Edit profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUserMenuOpen(false);
                  void logout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <LogoutIcon className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>
      <button
        type="button"
        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        onClick={() => setCollapsedAndStore(!collapsed)}
        className={[
          'absolute top-[36px] z-30 flex h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-chrome-border text-white transition-[left] duration-200',
          'bg-[linear-gradient(to_right,var(--color-primary-deep)_50%,var(--color-primary)_50%)]',
          collapsed ? 'left-20' : 'left-60',
        ].join(' ')}
      >
        {collapsed ? (
          <ChevronRightIcon className="h-4 w-4" />
        ) : (
          <ChevronLeftIcon className="h-4 w-4" />
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-chrome-border bg-primary px-8 text-white">
          <h1 className="font-[family-name:var(--font-display)] text-xl leading-none">
            {platform ? 'SaaS Control Plane' : 'Venue CRM'}
          </h1>
          <NotificationBell />
        </header>
        <main className="min-h-0 flex-1 overflow-auto bg-canvas p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
