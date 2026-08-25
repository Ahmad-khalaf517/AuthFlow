import { Navigate } from '@tanstack/react-router';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuthStore } from '@/store/authStore';

export function RegisterPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <RegisterForm />;
}
