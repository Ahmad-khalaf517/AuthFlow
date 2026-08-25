import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          'grid size-9 place-items-center rounded-xl',
          light ? 'bg-white text-primary-700' : 'bg-primary-600 text-white',
        )}
      >
        <ShieldCheck className="size-5" strokeWidth={2.2} />
      </div>
      {!compact ? (
        <span
          className={cn(
            'font-sans text-xl font-extrabold tracking-tight',
            light ? 'text-white' : 'text-ink',
          )}
        >
          AuthFlow
        </span>
      ) : null}
    </div>
  );
}
