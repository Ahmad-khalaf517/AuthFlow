import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/Form';
import { Input } from '@/components/ui/Input';
import { useLogin } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { describedBy } from '@/utils/form';
import { loginSchema, type LoginFormValues } from '@/utils/validation';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const login = useLogin();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      await navigate({ to: '/dashboard', replace: true });
    } catch (error) {
      toast(
        error instanceof ApiError ? error.message : 'Unable to sign in. Please try again.',
        'error',
      );
    }
  });

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">Welcome back</p>
      <h2 className="mt-3 text-3xl font-extrabold text-ink sm:text-4xl">Sign in to AuthFlow</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Enter your details to continue to your secure workspace.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
        <FormField label="Email address" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            hasError={Boolean(errors.email)}
            aria-describedby={describedBy('email', Boolean(errors.email))}
            {...register('email')}
          />
        </FormField>
        <FormField label="Password" htmlFor="password" error={errors.password?.message}>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="pr-11"
              hasError={Boolean(errors.password)}
              aria-describedby={describedBy('password', Boolean(errors.password))}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </FormField>
        <Button type="submit" size="lg" className="w-full" isLoading={login.isPending}>
          Sign in <ArrowRight className="size-4" />
        </Button>
      </form>
      <p className="mt-7 text-center text-sm text-slate-600">
        New to AuthFlow?{' '}
        <Link
          to="/register"
          className="font-bold text-primary-600 hover:text-primary-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
