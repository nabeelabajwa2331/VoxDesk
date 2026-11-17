import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const controlClass =
  'min-h-11 w-full rounded-md border border-line-strong bg-raised px-3 text-ink type-body disabled:opacity-60 aria-[invalid=true]:border-danger-fg';

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="type-label">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="type-caption text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="type-caption font-semibold text-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}

type Common = { label: ReactNode; hint?: ReactNode; error?: string; className?: string };

export function TextField({ label, hint, error, className, ...input }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(p) => <input className={controlClass} {...p} {...input} />}
    </Field>
  );
}

export function SelectField({ label, hint, error, className, children, ...select }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(p) => (
        <select className={controlClass} {...p} {...select}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function TextAreaField({ label, hint, error, className, ...area }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(p) => <textarea className={cn(controlClass, 'min-h-24 py-2.5')} {...p} {...area} />}
    </Field>
  );
}

export function Checkbox({ label, description, className, ...input }: { label: ReactNode; description?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex min-h-11 cursor-pointer items-start gap-3 py-2', className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 rounded-sm accent-[var(--brand-magenta)]" {...input} />
      <span className="flex flex-col">
        <span>{label}</span>
        {description && <span className="type-body-sm text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 py-2">
      <label htmlFor={id} className="flex min-w-0 cursor-pointer flex-col">
        <span className="font-semibold">{label}</span>
        {description && <span className="type-body-sm text-ink-muted">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-60',
          checked ? 'border-brand bg-brand' : 'border-line-strong bg-surface',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0.5 size-5 rounded-full transition-[left]',
            checked ? 'left-6 bg-on-brand' : 'left-0.5 bg-line-strong',
          )}
        />
      </button>
    </div>
  );
}
