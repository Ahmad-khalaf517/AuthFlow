import { create } from 'zustand';
import type { User } from '@/types/user';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface UiState {
  toasts: Toast[];
  isUserDialogOpen: boolean;
  selectedUser: User | null;
  isSidebarOpen: boolean;
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
  openUserDialog: (user?: User) => void;
  closeUserDialog: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  isUserDialogOpen: false,
  selectedUser: null,
  isSidebarOpen: false,
  addToast: (message, type) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    window.setTimeout(
      () => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      5000,
    );
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  openUserDialog: (user) => set({ isUserDialogOpen: true, selectedUser: user ?? null }),
  closeUserDialog: () => set({ isUserDialogOpen: false, selectedUser: null }),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
}));
