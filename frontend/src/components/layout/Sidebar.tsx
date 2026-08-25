import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, LogOut, UserRound, UsersRound, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/cn';
import { getFullName, getInitials } from '@/utils/formatters';

export function Sidebar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { isSidebarOpen, setSidebarOpen } = useUiStore();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (!user) return null;

  const links = [
    { to: '/dashboard' as const, label: 'Overview', icon: LayoutDashboard },
    ...(user.type === 'admin'
      ? [{ to: '/users' as const, label: 'User management', icon: UsersRound }]
      : []),
    { to: '/profile' as const, label: 'My profile', icon: UserRound },
  ];

  const handleLogout = () => {
    setSidebarOpen(false);
    logout();
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center justify-between px-6">
        <Logo light />
        <button
          className="rounded-lg p-2 text-blue-100 hover:bg-white/10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        >
          <X className="size-5" />
        </button>
      </div>
      <nav className="mt-5 flex-1 space-y-1.5 px-4" aria-label="Main navigation">
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100">
          Workspace
        </p>
        {links.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',
                active
                  ? 'bg-white text-primary-900 shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="size-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded-2xl border border-white/15 bg-white/[0.08] p-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-300/15 text-sm font-bold text-white">
            {getInitials(user)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{getFullName(user)}</p>
            <p className="truncate text-xs capitalize text-blue-100">{user.type} account</p>
          </div>
          <button
            onClick={handleLogout}
            className="grid size-10 place-items-center rounded-xl text-blue-100 hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 bg-gradient-to-b from-[#102b5c] to-[#17356f] lg:block">
        {content}
      </aside>
      {isSidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}
      {isSidebarOpen ? (
        <aside
          className="fixed inset-y-0 left-0 z-50 w-[280px] bg-gradient-to-b from-[#102b5c] to-[#17356f] shadow-2xl lg:hidden"
          aria-label="Mobile navigation"
        >
          {content}
        </aside>
      ) : null}
    </>
  );
}
