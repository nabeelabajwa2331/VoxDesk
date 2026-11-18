import { AiPill } from './Badge';
import { cn } from '../../lib/cn';

export function Wordmark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <img src="/logos/voxdesk-mark.svg" alt="" width={size} height={size} className="block dark:hidden" />
      <img src="/logos/voxdesk-mark-dark.svg" alt="" width={size} height={size} className="hidden dark:block" />
      <span className="font-display text-xl leading-7 font-bold text-ink max-[359px]:hidden" aria-hidden="true">VoxDesk</span>
      <AiPill />
      <span className="sr-only">VoxDesk AI</span>
    </span>
  );
}
