import type { ReactNode } from 'react';
import { Navigate } from '@tanstack/react-router';
import { LoaderCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  if (!isHydrated) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <LoaderCircle
          className="size-7 animate-spin text-primary-600"
          aria-label="Loading session"
        />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.type !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}
