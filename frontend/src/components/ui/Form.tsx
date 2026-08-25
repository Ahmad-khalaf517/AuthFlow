import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  optional?: boolean;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
  optional,
}: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  const hintId = `${htmlFor}-hint`;
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-700">
          {label}
        </label>
        {optional ? <span className="text-xs text-slate-400">Optional</span> : null}
      </div>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
