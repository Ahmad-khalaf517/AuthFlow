import { zodResolver } from '@hookform/resolvers/zod';
import { Save, UserPlus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { useToast } from '@/hooks/useToast';
import { useUiStore } from '@/store/uiStore';
import { adminUserEditSchema, type AdminUserEditFormValues } from '@/utils/validation';

export function UserDialog() {
  const { isUserDialogOpen, selectedUser, closeUserDialog } = useUiStore();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const { toast } = useToast();
  const isEdit = Boolean(selectedUser);
  const schema = useMemo(
    () =>
      adminUserEditSchema.superRefine((data, context) => {
        if (!isEdit && data.password === '')
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'Password is required',
          });
      }),
    [isEdit],
  );
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminUserEditFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      city: '',
      age: 18,
      password: '',
      type: 'client',
    },
  });

  useEffect(() => {
    reset(
      selectedUser
        ? {
            first_name: selectedUser.first_name,
            last_name: selectedUser.last_name,
            email: selectedUser.email,
            phone_number: selectedUser.phone_number,
            city: selectedUser.city,
            age: selectedUser.age,
            password: '',
            type: selectedUser.type,
          }
        : {
            first_name: '',
            last_name: '',
            email: '',
            phone_number: '',
            city: '',
            age: 18,
            password: '',
            type: 'client',
          },
    );
  }, [reset, selectedUser, isUserDialogOpen]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (selectedUser) {
        await updateMutation.mutateAsync({
          id: selectedUser.id,
          data: { ...values, password: values.password || undefined },
        });
        toast('User updated successfully.', 'success');
      } else {
        await createMutation.mutateAsync({
          ...values,
          age: values.age,
          password: values.password,
        });
        toast('User created successfully.', 'success');
      }
      closeUserDialog();
    } catch (error) {
      toast(
        error instanceof ApiError
          ? error.message
          : `Unable to ${isEdit ? 'update' : 'create'} user.`,
        'error',
      );
    }
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={isUserDialogOpen}
      onOpenChange={(open) => !open && closeUserDialog()}
      title={isEdit ? 'Edit user' : 'Create a new user'}
      description={
        isEdit
          ? 'Update account details or change this user’s role.'
          : 'Add a person and choose the access level they need.'
      }
    >
      <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            htmlFor="user-first-name"
            error={errors.first_name?.message}
          >
            <Input
              id="user-first-name"
              hasError={Boolean(errors.first_name)}
              {...register('first_name')}
            />
          </FormField>
          <FormField label="Last name" htmlFor="user-last-name" error={errors.last_name?.message}>
            <Input
              id="user-last-name"
              hasError={Boolean(errors.last_name)}
              {...register('last_name')}
            />
          </FormField>
        </div>
        <FormField label="Email address" htmlFor="user-email" error={errors.email?.message}>
          <Input
            id="user-email"
            type="email"
            hasError={Boolean(errors.email)}
            {...register('email')}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone number" htmlFor="user-phone" error={errors.phone_number?.message}>
            <Input
              id="user-phone"
              type="tel"
              placeholder="+96170123456"
              hasError={Boolean(errors.phone_number)}
              {...register('phone_number')}
            />
          </FormField>
          <FormField label="City" htmlFor="user-city" error={errors.city?.message}>
            <Input id="user-city" hasError={Boolean(errors.city)} {...register('city')} />
          </FormField>
          <FormField label="Age" htmlFor="user-age" error={errors.age?.message}>
            <Input
              id="user-age"
              type="number"
              min={1}
              max={120}
              hasError={Boolean(errors.age)}
              {...register('age', { valueAsNumber: true })}
            />
          </FormField>
          <FormField label="Role" htmlFor="user-role" error={errors.type?.message}>
            <select
              id="user-role"
              className="h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-ink shadow-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
              {...register('type')}
            >
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
          </FormField>
        </div>
        <FormField
          label={isEdit ? 'New password' : 'Password'}
          htmlFor="user-password"
          error={errors.password?.message}
          hint={
            isEdit
              ? 'Leave blank to keep the current password.'
              : '8+ characters with at least one letter and number.'
          }
          optional={isEdit}
        >
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            placeholder={isEdit ? 'Keep current password' : 'Create password'}
            hasError={Boolean(errors.password)}
            {...register('password')}
          />
        </FormField>
        <div className="flex justify-end gap-3 border-t pt-5">
          <Button type="button" variant="secondary" onClick={closeUserDialog}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending}>
            {isEdit ? <Save className="size-4" /> : <UserPlus className="size-4" />}
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
