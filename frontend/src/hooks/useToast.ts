import { useUiStore, type ToastType } from '@/store/uiStore';

export function useToast(): { toast: (message: string, type?: ToastType) => void } {
  const addToast = useUiStore((state) => state.addToast);
  return { toast: (message, type = 'info') => addToast(message, type) };
}
