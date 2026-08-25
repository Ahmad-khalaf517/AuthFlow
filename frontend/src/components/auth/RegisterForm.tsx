import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { useRegister } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { describedBy } from '@/utils/form';
import { registerSchema, type RegisterFormValues } from '@/utils/validation';

const fields = [
  { name: 'first_name', label: 'First name', placeholder: 'Maya', autoComplete: 'given-name' },
  { name: 'last_name', label: 'Last name', placeholder: 'Haddad', autoComplete: 'family-name' },
] as const;

export function RegisterForm() {
  const navigate = useNavigate();
  const registration = useRegister();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      city: '',
      age: 18,
      password: '',
      confirm_password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registration.mutateAsync({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone_number: values.phone_number,
        city: values.city,
        age: values.age,
        password: values.password,
      });
      toast('Your account is ready. Welcome to AuthFlow!', 'success');
      await navigate({ to: '/dashboard', replace: true });
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Unable to create your account.', 'error');
    }
  });

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">Get started</p>
      <h2 className="mt-3 text-3xl font-extrabold text-ink sm:text-4xl">Create your account</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        A few details and your secure workspace will be ready.
      </p>
      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <FormField
              key={field.name}
              label={field.label}
              htmlFor={field.name}
              error={errors[field.name]?.message}
            >
              <Input
                id={field.name}
                placeholder={field.placeholder}
                autoComplete={field.autoComplete}
                hasError={Boolean(errors[field.name])}
                aria-describedby={describedBy(field.name, Boolean(errors[field.name]))}
                {...register(field.name)}
              />
            </FormField>
          ))}
        </div>
        <FormField label="Email address" htmlFor="register-email" error={errors.email?.message}>
          <Input
            id="register-email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            hasError={Boolean(errors.email)}
            aria-describedby={describedBy('register-email', Boolean(errors.email))}
            {...register('email')}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Phone number"
            htmlFor="phone_number"
            error={errors.phone_number?.message}
          >
            <Input
              id="phone_number"
              type="tel"
              placeholder="+96170123456"
              autoComplete="tel"
              hasError={Boolean(errors.phone_number)}
              aria-describedby={describedBy('phone_number', Boolean(errors.phone_number))}
              {...register('phone_number')}
            />
          </FormField>
          <FormField label="City" htmlFor="city" error={errors.city?.message}>
            <Input
              id="city"
              placeholder="Beirut"
              autoComplete="address-level2"
              hasError={Boolean(errors.city)}
              aria-describedby={describedBy('city', Boolean(errors.city))}
              {...register('city')}
            />
          </FormField>
        </div>
        <FormField label="Age" htmlFor="age" error={errors.age?.message}>
          <Input
            id="age"
            type="number"
            min={1}
            max={120}
            placeholder="28"
            hasError={Boolean(errors.age)}
            aria-describedby={describedBy('age', Boolean(errors.age))}
            {...register('age', { valueAsNumber: true })}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Password"
            htmlFor="register-password"
            error={errors.password?.message}
            hint="8+ characters with a letter and number"
          >
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="Create password"
              hasError={Boolean(errors.password)}
              aria-describedby={describedBy('register-password', Boolean(errors.password), true)}
              {...register('password')}
            />
          </FormField>
          <FormField
            label="Confirm password"
            htmlFor="confirm_password"
            error={errors.confirm_password?.message}
          >
            <Input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              hasError={Boolean(errors.confirm_password)}
              aria-describedby={describedBy('confirm_password', Boolean(errors.confirm_password))}
              {...register('confirm_password')}
            />
          </FormField>
        </div>
        <Button
          type="submit"
          size="lg"
          className="mt-2 w-full"
          isLoading={registration.isPending}
          disabled={!isValid}
        >
          Create account <ArrowRight className="size-4" />
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-primary-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
