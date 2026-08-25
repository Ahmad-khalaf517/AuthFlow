import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6 text-center">
      <div>
        <p className="text-7xl font-extrabold text-primary-100">404</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">Page not found</h1>
        <p className="mt-3 text-slate-500">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white hover:bg-primary-700"
        >
          <ArrowLeft className="size-4" />
          Back to overview
        </Link>
      </div>
    </main>
  );
}
