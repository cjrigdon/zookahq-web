import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type DetailSection = {
  id: string;
  label: string;
  count?: number;
};

export function DetailShell({
  backTo,
  backLabel,
  title,
  subtitle,
  badge,
  actions,
  sections,
  activeSection,
  onSectionChange,
  aside,
  children,
}: {
  backTo: string;
  backLabel: string;
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  sections: DetailSection[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Link to={backTo} className="text-sm text-primary hover:underline">
          ← {backLabel}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-text">{title}</h2>
              {badge}
            </div>
            {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Detail sections" role="tablist">
          {sections.map((section) => {
            const active = section.id === activeSection;
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSectionChange(section.id)}
                className={[
                  'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition',
                  active
                    ? 'border-primary font-medium text-primary'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                ].join(' ')}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{section.label}</span>
                  {typeof section.count === 'number' ? (
                    <span
                      className={[
                        'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none',
                        active
                          ? 'bg-primary text-white'
                          : 'bg-slate-200 text-slate-700',
                      ].join(' ')}
                    >
                      {section.count}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {aside}

      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-support px-2.5 py-1 text-xs font-medium capitalize text-primary-deep">
      {children}
    </span>
  );
}
