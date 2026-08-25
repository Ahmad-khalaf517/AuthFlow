import { Outlet } from '@tanstack/react-router';
import { Toaster } from '@/components/ui/Toast';

export function App() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}
