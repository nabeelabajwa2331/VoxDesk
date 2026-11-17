import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '../../lib/cn';
import { Spinner } from './States';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand border-transparent hover:bg-brand-strong',
  outline: 'bg-raised text-brand-strong border-line-strong hover:bg-surface',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-surface',
  danger: 'bg-raised text-danger-fg border-line-strong hover:bg-danger-bg',
};

const sizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 type-body',
  sm: 'min-h-9 px-3 type-body-sm',
};

export function buttonClass(variant: ButtonVariant = 'outline', size: ButtonSize = 'md', extra?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-semibold transition-colors disabled:opacity-60',
    variants[variant],
    sizes[size],
    extra,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'outline', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={size === 'sm' ? 16 : 18} /> : icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function ButtonLink({ variant = 'outline', size = 'md', icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, cn('no-underline', className as string))} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({ label, className, children, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'relative inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-line-strong bg-raised text-ink hover:bg-surface',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
