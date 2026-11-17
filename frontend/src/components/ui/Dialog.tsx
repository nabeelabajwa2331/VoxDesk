import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
  variant?: 'modal' | 'drawer';
  dismissible?: boolean;
}

/**
 * Accessible modal built on the native <dialog> element: focus is trapped,
 * Escape closes it, and the page behind is inert while it is open.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', variant = 'modal', dismissible = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const drawer = variant === 'drawer';

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
      className={cn(
        'm-0 max-h-none max-w-none overflow-hidden border border-line bg-raised p-0 text-ink',
        drawer
          ? 'ml-auto h-dvh w-full rounded-none sm:w-[480px] sm:rounded-l-lg'
          : cn(
              'mx-auto mt-auto w-full rounded-t-lg sm:my-auto sm:rounded-lg',
              size === 'lg' ? 'sm:w-[min(760px,calc(100vw-32px))]' : 'sm:w-[min(520px,calc(100vw-32px))]',
            ),
      )}
    >
      {open && (
        <div className={cn('flex flex-col', drawer ? 'h-dvh' : 'max-h-[min(90dvh,860px)]')}>
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="type-heading-sm">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-0.5 type-body-sm text-ink-muted">
                  {description}
                </p>
              )}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink"
              >
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  pending?: boolean;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Go back',
  tone = 'danger',
  pending,
  children,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={pending ? () => {} : onClose}
      dismissible={!pending}
      title={title}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {body && <div className="text-ink-muted">{body}</div>}
        {children}
      </div>
    </Dialog>
  );
}
