import { TrashIcon } from './TrashIcon';

export function RowDeleteButton({
  label = 'Delete',
  confirmMessage = 'Delete this item?',
  onDelete,
}: {
  label?: string;
  confirmMessage?: string;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-700"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        if (window.confirm(confirmMessage)) onDelete();
      }}
    >
      <TrashIcon className="h-4 w-4" />
    </button>
  );
}
