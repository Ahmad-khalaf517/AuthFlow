import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100',
        hasError && 'border-danger focus:border-danger focus:ring-red-100',
        className,
      )}
      aria-invalid={hasError || undefined}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
