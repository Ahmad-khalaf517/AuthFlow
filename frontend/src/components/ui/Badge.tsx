import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'blue' | 'green' | 'gray' | 'red';
}

export function Badge({ className, tone = 'gray', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize',
        tone === 'blue' && 'bg-blue-50 text-primary-700',
        tone === 'green' && 'bg-emerald-50 text-emerald-700',
        tone === 'gray' && 'bg-slate-100 text-slate-600',
        tone === 'red' && 'bg-red-50 text-red-700',
        className,
      )}
      {...props}
    />
  );
}
