export function ReportResultTable({ result }: { result: any }) {
  const columns = result.columns ?? [];
  const rows = result.rows ?? [];
  const grouped = result.grouped ?? null;

  return (
    <div className="space-y-4">
      {grouped && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-100 px-4 py-3 text-sm font-medium">
            Grouped summary
          </header>
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Group</th>
                <th className="px-4 py-2 text-right">Count</th>
                <th className="px-4 py-2 text-right">Sum value</th>
                <th className="px-4 py-2 text-right">Sum total</th>
                <th className="px-4 py-2 text-right">Sum balance</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g: any) => (
                <tr key={g.key} className="border-t border-slate-100">
                  <td className="px-4 py-2">{g.label}</td>
                  <td className="px-4 py-2 text-right">{g.count}</td>
                  <td className="px-4 py-2 text-right">{g.sum_value ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{g.sum_total ?? '—'}</td>
                  <td className="px-4 py-2 text-right">{g.sum_balance_due ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-4 py-3 text-sm font-medium">
          Rows ({result.meta?.count ?? rows.length})
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {columns.map((col: any) => (
                  <th key={col.key} className="px-4 py-2 text-left">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, idx: number) => (
                <tr key={idx} className="border-t border-slate-100 hover:bg-support/40">
                  {columns.map((col: any) => (
                    <td key={col.key} className="px-4 py-2">
                      {formatCell(row[col.key], col.type)}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={Math.max(columns.length, 1)}>
                    No rows matched.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatCell(value: unknown, type?: string) {
  if (value == null || value === '') return '—';
  if (type === 'money') {
    return Number(value).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }
  return String(value);
}
