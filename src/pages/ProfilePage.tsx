import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, isPlatformHost } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type NotificationPreferences = {
  desktop: boolean;
  email: boolean;
  push: boolean;
};

function preferencesPath() {
  return isPlatformHost() ? '/platform/notifications/preferences' : '/notifications/preferences';
}

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: user.name,
      email: user.email,
    }));
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const path = isPlatformHost() ? '/platform/auth/profile' : '/auth/profile';
      const payload: Record<string, string> = {
        name: form.name,
        email: form.email,
      };
      if (form.password) {
        payload.password = form.password;
        payload.password_confirmation = form.password_confirmation;
      }
      return api(path, { method: 'PUT', body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      setMessage('Profile saved');
      setError(null);
      setForm((prev) => ({ ...prev, password: '', password_confirmation: '' }));
      await refresh();
    },
    onError: (err: Error) => {
      setMessage(null);
      setError(err.message);
    },
  });

  const prefsQuery = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => api<{ data: NotificationPreferences }>(preferencesPath()),
  });

  const savePrefs = useMutation({
    mutationFn: (prefs: NotificationPreferences) =>
      api(preferencesPath(), { method: 'PUT', body: JSON.stringify(prefs) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  function togglePref(key: keyof NotificationPreferences) {
    const current = prefsQuery.data?.data;
    if (!current) return;
    savePrefs.mutate({ ...current, [key]: !current[key] });
  }

  return (
    <div className="max-w-xl">
      <h2 className="font-[family-name:var(--font-display)] text-2xl">Edit profile</h2>
      <p className="mb-6 text-sm text-slate-600">Update your name, email, and password.</p>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Name</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Email</span>
          <input
            type="email"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">New password</span>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Confirm password</span>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={form.password_confirmation}
            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
            autoComplete="new-password"
          />
        </label>
        {message && <p className="text-sm text-primary">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save profile'}
        </button>
      </form>

      <h2 className="mt-10 font-[family-name:var(--font-display)] text-2xl">Notifications</h2>
      <p className="mb-6 text-sm text-slate-600">
        Choose how you want to receive system notifications.
      </p>
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-6">
        {(
          [
            ['desktop', 'Desktop', 'Show unread items under the bell in the top bar.'],
            ['email', 'Email', 'Send a copy to your account email.'],
            ['push', 'Push', 'Reserved for mobile apps. Delivery starts when those apps ship.'],
          ] as const
        ).map(([key, label, help]) => (
          <label key={key} className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={Boolean(prefsQuery.data?.data[key])}
              disabled={!prefsQuery.data || savePrefs.isPending}
              onChange={() => togglePref(key)}
            />
            <span>
              <span className="block font-medium">{label}</span>
              <span className="text-slate-600">{help}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
