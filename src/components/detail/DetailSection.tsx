import type { ReactNode } from 'react';

export function DetailSection({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={['overflow-hidden rounded-xl border border-slate-200 bg-white', className]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-900">{title}</h3>
          {description ? <div className="mt-0.5 text-xs text-slate-500">{description}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
