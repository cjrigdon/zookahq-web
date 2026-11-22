import type { SelectHTMLAttributes } from 'react';

/** Shared ZookaHQ select class — also applied globally to native `select` elements. */
export const selectClassName = 'zhq-select zhq-select--block';

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  fullWidth?: boolean;
};

export function Select({ className, fullWidth = true, children, ...props }: SelectProps) {
  return (
    <select
      className={cx('zhq-select', fullWidth ? 'zhq-select--block' : false, className)}
      {...props}
    >
      {children}
    </select>
  );
}
