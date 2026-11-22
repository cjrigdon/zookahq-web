import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, isPlatformHost } from '../../api/client';
import { BellIcon } from './navIcons';

export type SystemNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  channels: string[];
  read_at: string | null;
  created_at: string;
};

function notificationsPath(suffix = '') {
  return isPlatformHost() ? `/platform/notifications${suffix}` : `/notifications${suffix}`;
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const delta = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(delta / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const countQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api<{ count: number }>(notificationsPath('/unread-count')),
    refetchInterval: 30000,
  });

  const listQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => api<{ data: SystemNotification[] }>(notificationsPath()),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: number) =>
      api(notificationsPath(`/${id}/read`), { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => api(notificationsPath('/read-all'), { method: 'POST' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  const unread = countQuery.data?.count ?? 0;
  const items = listQuery.data?.data ?? [];

  function openItem(item: SystemNotification) {
    if (!item.read_at) {
      markRead.mutate(item.id);
    }
    setOpen(false);
    if (item.action_url) {
      navigate(item.action_url);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-md p-2 text-white hover:bg-white/10"
      >
        <BellIcon className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-text">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-md border border-chrome-border bg-white text-text shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {listQuery.isLoading && (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Loading…</p>
            )}
            {!listQuery.isLoading && items.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
            )}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => openItem(item)}
                className={[
                  'block w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50',
                  item.read_at ? 'bg-white' : 'bg-support/40',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{item.title}</p>
                  <span className="shrink-0 text-[11px] text-slate-500">
                    {formatWhen(item.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{item.body}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
