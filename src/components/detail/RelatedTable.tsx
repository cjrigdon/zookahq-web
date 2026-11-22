import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { DetailSection } from './DetailSection';
import { RowDeleteButton } from './RowDeleteButton';

export type RelatedColumn = {
  key: string;
  label: string;
  render?: (row: any) => ReactNode;
};

export function RelatedTable({
  title,
  rows,
  columns,
  emptyText = 'None yet.',
  headerAction,
  getRowLink,
  onRowClick,
  onRowDelete,
  deleteConfirmMessage = 'Delete this item?',
  bare = false,
}: {
  title?: string;
  rows: any[];
  columns: RelatedColumn[];
  emptyText?: string;
  headerAction?: ReactNode;
  getRowLink?: (row: any) => string;
  /** Prefer for inline edit flows; use getRowLink for navigation. */
  onRowClick?: (row: any) => void;
  onRowDelete?: (row: any) => void;
  deleteConfirmMessage?: string | ((row: any) => string);
  /** Render only the table when wrapped by an outer DetailSection. */
  bare?: boolean;
}) {
  const navigate = useNavigate();
  const colCount = columns.length + (onRowDelete ? 1 : 0);

  const table = (
    <table className="min-w-full text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr>
          {columns.map((col) => (
            <th key={col.key} className="px-4 py-2 text-left">
              {col.label}
            </th>
          ))}
          {onRowDelete ? <th className="w-10 px-2 py-2" aria-label="Actions" /> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const href = getRowLink?.(row);
          const clickable = Boolean(href || onRowClick);
          return (
            <tr
              key={row.id}
              className={[
                'border-t border-slate-100',
                clickable ? 'cursor-pointer hover:bg-support/40' : '',
              ].join(' ')}
              onClick={() => {
                if (onRowClick) onRowClick(row);
                else if (href) navigate(href);
              }}
            >
              {columns.map((col, index) => {
                const content = col.render ? col.render(row) : String(row[col.key] ?? '—');
                return (
                  <td key={col.key} className="px-4 py-2">
                    {clickable && index === 0 ? (
                      <span className="font-medium text-slate-900 no-underline">{content}</span>
                    ) : (
                      content
                    )}
                  </td>
                );
              })}
              {onRowDelete ? (
                <td className="px-2 py-2 text-right">
                  <RowDeleteButton
                    confirmMessage={
                      typeof deleteConfirmMessage === 'function'
                        ? deleteConfirmMessage(row)
                        : deleteConfirmMessage
                    }
                    onDelete={() => onRowDelete(row)}
                  />
                </td>
              ) : null}
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td className="px-4 py-6 text-slate-500" colSpan={Math.max(colCount, 1)}>
              {emptyText}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  if (bare) return table;

  return (
    <DetailSection title={title ?? 'Related'} action={headerAction}>
      {table}
    </DetailSection>
  );
}
