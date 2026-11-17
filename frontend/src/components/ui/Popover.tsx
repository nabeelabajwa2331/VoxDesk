import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface PopoverProps {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-controls': string }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  width?: string;
  label: string;
}

/** Click-to-open panel for menus. Closes on outside click, Escape, or after a choice. */
export function Popover({ trigger, children, align = 'end', width = 'w-80', label }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={root} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), 'aria-expanded': open, 'aria-controls': id })}
      {open && (
        <div
          id={id}
          role="region"
          aria-label={label}
          className={cn(
            'absolute top-full z-30 mt-2 max-w-[calc(100vw-32px)] overflow-hidden rounded-lg border border-line bg-raised',
            align === 'end' ? 'right-0' : 'left-0',
            width,
          )}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, onClick, icon }: { children: ReactNode; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-ink hover:bg-surface"
    >
      {icon}
      {children}
    </button>
  );
}
