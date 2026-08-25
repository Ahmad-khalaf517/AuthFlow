import { useMutation } from '@tanstack/react-query';
import type { LoginCredentials, RegisterInput } from '@/types/auth';
import { useAuthStore } from '@/store/authStore';

export function useLogin() {
  const login = useAuthStore((state) => state.login);
  return useMutation<void, Error, LoginCredentials>({ mutationFn: login });
}

export function useRegister() {
  const register = useAuthStore((state) => state.register);
  return useMutation<void, Error, RegisterInput>({ mutationFn: register });
}
