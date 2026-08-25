import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { loginRequest, registerRequest } from '@/api/auth';
import { getCurrentUser } from '@/api/users';
import type { LoginCredentials, RegisterInput } from '@/types/auth';
import type { User } from '@/types/user';
import { AUTH_STORAGE_KEY } from '@/utils/constants';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setHydrated: (isHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      isHydrated: false,
      login: async (credentials) => {
        const tokenResponse = await loginRequest(credentials);
        set({ token: tokenResponse.access_token, isAuthenticated: true });
        try {
          const user = await getCurrentUser();
          set({ user });
        } catch (error) {
          get().logout();
          throw error;
        }
      },
      register: async (data) => {
        await registerRequest(data);
        await get().login({ email: data.email, password: data.password });
      },
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      setUser: (user) => set({ user }),
      setHydrated: (isHydrated) => set({ isHydrated }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: ({ token, user, isAuthenticated }) => ({ token, user, isAuthenticated }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
