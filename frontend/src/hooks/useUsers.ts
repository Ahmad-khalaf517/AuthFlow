import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { createUser, deleteUser, getUsers, updateUser, type GetUsersParams } from '@/api/users';
import { queryClient } from '@/lib/queryClient';
import type { AdminUserCreateInput, AdminUserUpdateInput } from '@/types/user';

export const usersQueryKey = ['users'] as const;

export function useUsers(params: GetUsersParams) {
  return useQuery({
    queryKey: [...usersQueryKey, params],
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData,
  });
}

const invalidateUsers = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: usersQueryKey }),
    queryClient.invalidateQueries({ queryKey: ['stats'] }),
  ]);
};

export function useCreateUser() {
  return useMutation({
    mutationFn: (data: AdminUserCreateInput) => createUser(data),
    onSuccess: invalidateUsers,
  });
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AdminUserUpdateInput }) => updateUser(id, data),
    onSuccess: invalidateUsers,
  });
}

export function useDeleteUser() {
  return useMutation({ mutationFn: (id: string) => deleteUser(id), onSuccess: invalidateUsers });
}
