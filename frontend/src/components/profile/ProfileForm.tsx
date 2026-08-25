import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { useUpdateCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import type { User } from '@/types/user';
import { describedBy } from '@/utils/form';
import { profileSchema, type ProfileFormValues } from '@/utils/validation';

export function ProfileForm({ user }: { user: User }) {
  const update = useUpdateCurrentUser();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      city: user.city,
      age: user.age,
      password: '',
    },
  });

  useEffect(
    () =>
      reset({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        city: user.city,
        age: user.age,
        password: '',
      }),
    [reset, user],
  );

  const onSubmit = handleSubmit(async (values) => {
    const payload = { ...values, password: values.password || undefined };
    try {
      const updated = await update.mutateAsync(payload);
      reset({ ...updated, password: '' });
      toast('Profile updated successfully.', 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Unable to update your profile.', 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="p-5 sm:p-7" noValidate>
      <div className="mb-6">
        <h3 className="text-lg font-extrabold text-ink">Personal information</h3>
        <p className="mt-1 text-sm text-slate-500">
          Keep your contact details accurate and up to date.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          label="First name"
          htmlFor="profile-first-name"
          error={errors.first_name?.message}
        >
          <Input
            id="profile-first-name"
            autoComplete="given-name"
            hasError={Boolean(errors.first_name)}
            {...register('first_name')}
          />
        </FormField>
        <FormField label="Last name" htmlFor="profile-last-name" error={errors.last_name?.message}>
          <Input
            id="profile-last-name"
            autoComplete="family-name"
            hasError={Boolean(errors.last_name)}
            {...register('last_name')}
          />
        </FormField>
        <FormField label="Email address" htmlFor="profile-email" error={errors.email?.message}>
          <Input
            id="profile-email"
            type="email"
            autoComplete="email"
            hasError={Boolean(errors.email)}
            {...register('email')}
          />
        </FormField>
        <FormField
          label="Phone number"
          htmlFor="profile-phone"
          error={errors.phone_number?.message}
        >
          <Input
            id="profile-phone"
            type="tel"
            autoComplete="tel"
            hasError={Boolean(errors.phone_number)}
            {...register('phone_number')}
          />
        </FormField>
        <FormField label="City" htmlFor="profile-city" error={errors.city?.message}>
          <Input
            id="profile-city"
            autoComplete="address-level2"
            hasError={Boolean(errors.city)}
            {...register('city')}
          />
        </FormField>
        <FormField label="Age" htmlFor="profile-age" error={errors.age?.message}>
          <Input
            id="profile-age"
            type="number"
            min={1}
            max={120}
            hasError={Boolean(errors.age)}
            {...register('age', { valueAsNumber: true })}
          />
        </FormField>
      </div>
      <div className="my-7 border-t border-slate-100" />
      <div className="max-w-md">
        <FormField
          label="New password"
          htmlFor="profile-password"
          error={errors.password?.message}
          hint="Leave blank to keep your current password."
          optional
        >
          <Input
            id="profile-password"
            type="password"
            autoComplete="new-password"
            placeholder="Enter a new password"
            hasError={Boolean(errors.password)}
            aria-describedby={describedBy('profile-password', Boolean(errors.password), true)}
            {...register('password')}
          />
        </FormField>
      </div>
      <div className="mt-7 flex justify-end">
        <Button type="submit" isLoading={update.isPending} disabled={!isDirty}>
          <Save className="size-4" />
          Save changes
        </Button>
      </div>
    </form>
  );
}
