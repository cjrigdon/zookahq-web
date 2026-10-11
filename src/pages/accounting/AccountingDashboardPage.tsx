import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Link } from 'react-router-dom';

export function AccountingDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-summary'],
    queryFn: () => api<{ data: Record<string, number> }>('/accounting/reports/summary'),
  });

  const summary = data?.data;

  return (
    <div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl">Accounting</h2>
      <p className="mb-6 text-sm text-slate-600">AR, AP, inventory, and ledger overview.</p>

      {isLoading && <p className="text-slate-500">Loading…</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'AR open', value: summary?.ar_open_balance, money: true },
          { label: 'AP open', value: summary?.ap_open_balance, money: true },
          { label: 'Inventory value', value: summary?.inventory_value, money: true },
          { label: 'AR collected MTD', value: summary?.ar_collected_mtd, money: true },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="text-xs uppercase tracking-wide text-slate-500">{card.label}</div>
            <div className="mt-2 text-2xl font-medium text-text">
              {card.money
                ? Number(card.value ?? 0).toLocaleString(undefined, {
                    style: 'currency',
                    currency: 'USD',
                  })
                : (card.value ?? '—')}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {[
          ['Invoices', '/accounting/ar-invoices'],
          ['AR Payments', '/accounting/ar-payments'],
          ['AP Bills', '/accounting/ap-bills'],
          ['AP Payments', '/accounting/ap-payments'],
          ['Inventory', '/accounting/inventory'],
          ['Budgets', '/accounting/budgets'],
          ['General Ledger', '/accounting/gl'],
          ['Reports', '/accounting/reports'],
        ].map(([label, to]) => (
          <Link
            key={to}
            to={to}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-primary transition hover:bg-support/40"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
