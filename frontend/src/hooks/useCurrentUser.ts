import { useMutation, useQuery } from '@tanstack/react-query';
import { getCurrentUser, updateCurrentUser } from '@/api/users';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/authStore';
import type { UserUpdateInput } from '@/types/user';

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const user = await getCurrentUser();
      setUser(user);
      return user;
    },
    enabled: isAuthenticated,
  });
}

export function useUpdateCurrentUser() {
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: (data: UserUpdateInput) => updateCurrentUser(data),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(['current-user'], user);
    },
  });
}
