import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { createUser, deleteUser, getUsers, updateUser, type GetUsersParams } from '@/api/users';
import type { AdminUserCreateInput, AdminUserUpdateInput } from '@/types/user';

export const usersQueryKey = ['users'] as const;

export function useUsers(params: GetUsersParams) {
  return useQuery({
    queryKey: [...usersQueryKey, params],
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData,
  });
}

const invalidateUsers = async (queryClient: QueryClient) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: usersQueryKey }),
    queryClient.invalidateQueries({ queryKey: ['stats'] }),
  ]);
};

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AdminUserCreateInput) => createUser(data),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminUserUpdateInput }) => updateUser(id, data),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => invalidateUsers(queryClient),
  });
}
