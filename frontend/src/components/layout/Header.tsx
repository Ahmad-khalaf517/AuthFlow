import { Menu, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { getInitials } from '@/utils/formatters';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  if (!user) return null;
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/75 bg-white/85 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
      <div className="flex items-center gap-3">
        <button
          className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-primary-100 hover:bg-blue-50 lg:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="size-5" />
        </button>
        <div className="hidden items-center gap-2 text-sm font-semibold text-slate-600 sm:flex">
          <ShieldCheck className="size-4 text-emerald-700" aria-hidden="true" />
          <span>Secure workspace</span>
        </div>
        <span className="text-sm font-extrabold text-ink sm:hidden">Dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold text-ink">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-xs font-semibold capitalize text-slate-600">{user.type} account</p>
        </div>
        <div className="grid size-11 place-items-center rounded-xl bg-primary-50 text-sm font-extrabold text-primary-800 ring-1 ring-primary-100">
          {getInitials(user)}
        </div>
      </div>
    </header>
  );
}
