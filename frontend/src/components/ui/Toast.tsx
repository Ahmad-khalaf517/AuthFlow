import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';
import { useUiStore, type ToastType } from '@/store/uiStore';
import { cn } from '@/lib/cn';

const icons: Record<ToastType, typeof Info> = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
};

export function Toaster() {
  const toasts = useUiStore((state) => state.toasts);
  const removeToast = useUiStore((state) => state.removeToast);
  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex animate-fade-up items-start gap-3 rounded-xl border bg-white p-4 shadow-float',
              toast.type === 'success' && 'border-emerald-200',
              toast.type === 'error' && 'border-red-200',
              toast.type === 'info' && 'border-blue-200',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 size-5 shrink-0',
                toast.type === 'success' && 'text-success',
                toast.type === 'error' && 'text-danger',
                toast.type === 'info' && 'text-primary-600',
              )}
            />
            <p className="flex-1 text-sm font-medium leading-5 text-slate-700">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="rounded text-slate-400 hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
