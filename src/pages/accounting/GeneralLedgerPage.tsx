import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { api } from '../../api/client';

type JournalLineForm = {
  gl_account_id: string;
  debit: string;
  credit: string;
  memo: string;
};

const emptyLine = (): JournalLineForm => ({
  gl_account_id: '',
  debit: '0',
  credit: '0',
  memo: '',
});

export function GeneralLedgerPage() {
  const qc = useQueryClient();
  const { data: accounts } = useQuery({
    queryKey: ['accounting-gl-accounts'],
    queryFn: () => api<{ data: any[] }>('/accounting/gl-accounts'),
  });
  const { data: entries, isLoading } = useQuery({
    queryKey: ['accounting-gl-entries'],
    queryFn: () => api<{ data: { data: any[] } }>('/accounting/gl-journal-entries'),
  });
  const [accountForm, setAccountForm] = useState({ code: '', name: '', type: 'expense' });
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    memo: '',
    lines: [emptyLine(), emptyLine()],
  });
  const [error, setError] = useState<string | null>(null);

  const createAccount = useMutation({
    mutationFn: () =>
      api('/accounting/gl-accounts', { method: 'POST', body: JSON.stringify(accountForm) }),
    onSuccess: async () => {
      setAccountForm({ code: '', name: '', type: 'expense' });
      await qc.invalidateQueries({ queryKey: ['accounting-gl-accounts'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const createEntry = useMutation({
    mutationFn: () =>
      api('/accounting/gl-journal-entries', {
        method: 'POST',
        body: JSON.stringify({
          entry_date: entryForm.entry_date,
          memo: entryForm.memo || undefined,
          lines: entryForm.lines.map((l) => ({
            gl_account_id: Number(l.gl_account_id),
            debit: Number(l.debit || 0),
            credit: Number(l.credit || 0),
            memo: l.memo || undefined,
          })),
        }),
      }),
    onSuccess: async () => {
      setEntryOpen(false);
      setEntryForm({
        entry_date: new Date().toISOString().slice(0, 10),
        memo: '',
        lines: [emptyLine(), emptyLine()],
      });
      await qc.invalidateQueries({ queryKey: ['accounting-gl-entries'] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateLine = (index: number, patch: Partial<JournalLineForm>) => {
    setEntryForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  };

  const debitTotal = entryForm.lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const creditTotal = entryForm.lines.reduce((s, l) => s + Number(l.credit || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">General Ledger</h2>
          <p className="text-sm text-slate-600">Chart of accounts and journal entries.</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
          onClick={() => {
            setError(null);
            setEntryOpen(true);
          }}
        >
          New journal entry
        </button>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-medium">Add GL account</h3>
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createAccount.mutate();
          }}
        >
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Code"
            value={accountForm.code}
            onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
            required
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Name"
            value={accountForm.name}
            onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
            required
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={accountForm.type}
            onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })}
          >
            {['asset', 'liability', 'equity', 'revenue', 'expense'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
            Add account
          </button>
        </form>
        {error && !entryOpen && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 overflow-hidden rounded-md border border-slate-100">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Type</th>
              </tr>
            </thead>
            <tbody>
              {(accounts?.data ?? []).map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{a.code}</td>
                  <td className="px-3 py-2">{a.name}</td>
                  <td className="px-3 py-2 capitalize">{a.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-4 py-3 text-sm font-medium">
          Journal entries
        </header>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Entry #</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Memo</th>
              <th className="px-4 py-3 text-left">Lines</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td className="px-4 py-6" colSpan={4}>
                  Loading…
                </td>
              </tr>
            )}
            {(entries?.data?.data ?? []).map((entry) => (
              <tr key={entry.id} className="border-t border-slate-100 hover:bg-support/40">
                <td className="px-4 py-3 font-medium">{entry.entry_number}</td>
                <td className="px-4 py-3">{entry.entry_date}</td>
                <td className="px-4 py-3">{entry.memo ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {(entry.lines ?? [])
                    .map(
                      (l: any) =>
                        `${l.account?.code ?? l.gl_account_id} D${l.debit}/C${l.credit}`,
                    )
                    .join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {entryOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              createEntry.mutate();
            }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6"
          >
            <h3 className="mb-4 text-lg font-semibold">New journal entry</h3>
            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Entry date</span>
                <input
                  type="date"
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  value={entryForm.entry_date}
                  onChange={(e) => setEntryForm({ ...entryForm, entry_date: e.target.value })}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-slate-600">Memo</span>
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                  value={entryForm.memo}
                  onChange={(e) => setEntryForm({ ...entryForm, memo: e.target.value })}
                />
              </label>
            </div>

            <div className="mb-3 space-y-3">
              {entryForm.lines.map((line, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded-md border border-slate-100 p-3 md:grid-cols-4"
                >
                  <label className="block text-sm md:col-span-2">
                    <span className="mb-1 block text-slate-600">Account</span>
                    <select
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={line.gl_account_id}
                      onChange={(e) => updateLine(index, { gl_account_id: e.target.value })}
                      required
                    >
                      <option value="">Select…</option>
                      {(accounts?.data ?? []).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Debit</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={line.debit}
                      onChange={(e) => updateLine(index, { debit: e.target.value })}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Credit</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={line.credit}
                      onChange={(e) => updateLine(index, { credit: e.target.value })}
                    />
                  </label>
                </div>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-primary"
                onClick={() =>
                  setEntryForm((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }))
                }
              >
                + Add line
              </button>
              <span
                className={
                  Math.round(debitTotal * 100) === Math.round(creditTotal * 100)
                    ? 'text-slate-600'
                    : 'text-red-600'
                }
              >
                Debits {debitTotal.toFixed(2)} / Credits {creditTotal.toFixed(2)}
              </span>
            </div>

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEntryOpen(false)} className="px-3 py-2 text-sm">
                Cancel
              </button>
              <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm font-medium">
                Post entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
