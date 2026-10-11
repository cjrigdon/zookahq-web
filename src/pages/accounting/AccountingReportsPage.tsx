import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../api/client';

type Tab = 'ar-aging' | 'ap-aging' | 'trial-balance' | 'budget-vs-actual';

const money = (n: number) =>
  Number(n ?? 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

export function AccountingReportsPage() {
  const [tab, setTab] = useState<Tab>('ar-aging');

  const arAging = useQuery({
    queryKey: ['accounting-ar-aging'],
    queryFn: () => api<{ data: any }>('/accounting/reports/ar-aging'),
    enabled: tab === 'ar-aging',
  });
  const apAging = useQuery({
    queryKey: ['accounting-ap-aging'],
    queryFn: () => api<{ data: any }>('/accounting/reports/ap-aging'),
    enabled: tab === 'ap-aging',
  });
  const trial = useQuery({
    queryKey: ['accounting-trial-balance'],
    queryFn: () => api<{ data: any }>('/accounting/reports/trial-balance'),
    enabled: tab === 'trial-balance',
  });
  const budgets = useQuery({
    queryKey: ['accounting-budget-vs-actual'],
    queryFn: () => api<{ data: any[] }>('/accounting/reports/budget-vs-actual'),
    enabled: tab === 'budget-vs-actual',
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'ar-aging', label: 'AR aging' },
    { id: 'ap-aging', label: 'AP aging' },
    { id: 'trial-balance', label: 'Trial balance' },
    { id: 'budget-vs-actual', label: 'Budget vs actual' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">Reports</h2>
        <p className="text-sm text-slate-600">Aging, ledger balances, and budget variance.</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t.id ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ar-aging' && (
        <AgingReport
          loading={arAging.isLoading}
          data={arAging.data?.data}
          empty="No open AR balances."
        />
      )}
      {tab === 'ap-aging' && (
        <AgingReport
          loading={apAging.isLoading}
          data={apAging.data?.data}
          empty="No open AP balances."
        />
      )}
      {tab === 'trial-balance' && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {trial.isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-right">Debits</th>
                <th className="px-4 py-3 text-right">Credits</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {(trial.data?.data?.rows ?? []).map((row: any) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3 text-right">{money(row.debit)}</td>
                  <td className="px-4 py-3 text-right">{money(row.credit)}</td>
                  <td className="px-4 py-3 text-right">{money(row.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-medium">
                <td className="px-4 py-3" colSpan={2}>
                  Totals
                </td>
                <td className="px-4 py-3 text-right">{money(trial.data?.data?.total_debits ?? 0)}</td>
                <td className="px-4 py-3 text-right">{money(trial.data?.data?.total_credits ?? 0)}</td>
                <td className="px-4 py-3 text-right">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {tab === 'budget-vs-actual' && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {budgets.isLoading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Budget</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-right">Budget</th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3 text-right">Variance</th>
              </tr>
            </thead>
            <tbody>
              {(budgets.data?.data ?? []).map((row: any) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-slate-500">
                      {row.period_start} → {row.period_end}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.gl_account
                      ? `${row.gl_account.code} ${row.gl_account.name}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">{money(row.budget_amount)}</td>
                  <td className="px-4 py-3 text-right">{money(row.actual_amount)}</td>
                  <td className="px-4 py-3 text-right">{money(row.variance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AgingReport({
  loading,
  data,
  empty,
}: {
  loading: boolean;
  data?: any;
  empty: string;
}) {
  const buckets = data?.buckets ?? {};
  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Current', buckets.current],
          ['1–30', buckets['1_30']],
          ['31–60', buckets['31_60']],
          ['61–90', buckets['61_90']],
          ['90+', buckets['90_plus']],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-1 text-lg font-medium">{money(Number(value ?? 0))}</div>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading && <p className="p-4 text-sm text-slate-500">Loading…</p>}
        {!loading && items.length === 0 && (
          <p className="p-4 text-sm text-slate-500">{empty}</p>
        )}
        {items.length > 0 && (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Number</th>
                <th className="px-4 py-3 text-left">Party</th>
                <th className="px-4 py-3 text-left">Due</th>
                <th className="px-4 py-3 text-left">Bucket</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row: any) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium">{row.number}</td>
                  <td className="px-4 py-3">{row.party ?? '—'}</td>
                  <td className="px-4 py-3">{row.due_date}</td>
                  <td className="px-4 py-3">{row.bucket}</td>
                  <td className="px-4 py-3 text-right">{money(row.balance_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
