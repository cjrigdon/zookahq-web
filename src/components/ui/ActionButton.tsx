import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Size = 'md' | 'sm';

const sizes: Record<Size, string> = {
  md: 'px-4 py-2',
  sm: 'px-3 py-1.5',
};

const base =
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition disabled:opacity-50';

const variants = {
  primary: 'bg-accent text-inherit hover:brightness-[0.98]',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
  ghost: 'bg-transparent px-3 py-2 font-normal text-slate-600 hover:bg-slate-100',
} as const;

type Variant = keyof typeof variants;

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function ActionButton({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(base, variants[variant], variant !== 'ghost' && sizes[size], className)}
      {...props}
    />
  );
}

type ActionLinkProps = LinkProps & {
  variant?: Exclude<Variant, 'ghost'>;
  size?: Size;
  children: ReactNode;
  className?: string;
};

export function ActionLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ActionLinkProps) {
  return (
    <Link
      className={cx(base, variants[variant], sizes[size], 'no-underline', className)}
      {...props}
    >
      {children}
    </Link>
  );
}
