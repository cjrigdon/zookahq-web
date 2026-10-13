import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isPlatformHost } from '../api/client';

export function LoginPage() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState(
    isPlatformHost() ? 'admin@zookahq.test' : 'admin@demo.test',
  );
  const [password, setPassword] = useState('password');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-[radial-gradient(circle_at_top_left,#ccfbf1,transparent_40%),linear-gradient(160deg,#f8fafc,#e2e8f0)] px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <img src="/zooka-logo.png" alt="" className="h-10 w-10 shrink-0" />
            <div className="font-[family-name:var(--font-display)] text-3xl text-primary">
              ZookaHQ
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {isPlatformHost()
              ? 'Sign in to the platform admin console'
              : 'Sign in to your venue workspace'}
          </p>
        </div>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-slate-600">Email</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <label className="mb-6 block text-sm">
          <span className="mb-1 block text-slate-600">Password</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-accent px-4 py-2.5 font-medium text-text hover:bg-accent-dark disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
