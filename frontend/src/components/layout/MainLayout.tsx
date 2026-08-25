import { Outlet } from '@tanstack/react-router';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-canvas">
        <Sidebar />
        <div className="lg:pl-72">
          <Header />
          <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-9">
            <Outlet />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
