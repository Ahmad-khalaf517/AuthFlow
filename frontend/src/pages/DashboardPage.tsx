import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  AtSign,
  CalendarDays,
  Cake,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { StatsCards } from '@/components/admin/StatsCards';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAuthStore } from '@/store/authStore';
import type { User } from '@/types/user';
import { formatDate, getFullName, getInitials } from '@/utils/formatters';

function DashboardHero({ user }: { user: User }) {
  const isAdmin = user.type === 'admin';

  return (
    <section
      aria-labelledby="dashboard-title"
      className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 px-5 py-6 shadow-card sm:px-8 sm:py-8"
    >
      <div className="absolute -right-16 -top-20 size-56 rounded-full bg-primary-100/60 blur-3xl" />
      <div className="absolute -bottom-24 right-1/3 size-48 rounded-full bg-emerald-100/40 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-center">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary-700">
            <Sparkles className="size-4" aria-hidden="true" />
            {isAdmin ? 'Admin workspace' : 'Personal workspace'}
          </p>
          <h1 id="dashboard-title" className="mt-3 text-3xl font-extrabold text-ink sm:text-4xl">
            Welcome back, {user.first_name}.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
            {isAdmin
              ? 'Monitor your workspace, review account activity, and manage users from one place.'
              : 'Your account details and profile tools are organized here whenever you need them.'}
          </p>
        </div>
        <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur sm:min-w-[300px]">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-900 text-sm font-extrabold text-white shadow-sm">
            {getInitials(user)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-extrabold text-ink">{getFullName(user)}</p>
              <Badge tone={isAdmin ? 'blue' : 'green'}>{user.type}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-slate-600">{user.email}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailItem({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-primary-700 shadow-sm">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-600">{label}</p>
        <div className="mt-1 break-words text-sm font-bold text-ink">{value}</div>
      </div>
    </div>
  );
}

function ClientOverview({ user }: { user: User }) {
  return (
    <section aria-label="Account overview" className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary-700">
              Your information
            </p>
            <h2 className="mt-2 text-xl font-extrabold text-ink">Account details</h2>
            <p className="mt-1 text-sm text-slate-600">A quick view of your current profile.</p>
          </div>
          <div className="hidden size-11 place-items-center rounded-2xl bg-blue-50 text-primary-700 sm:grid">
            <UserRound className="size-5" aria-hidden="true" />
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <DetailItem
            icon={<AtSign className="size-4" aria-hidden="true" />}
            label="Email"
            value={user.email}
          />
          <DetailItem
            icon={<Phone className="size-4" aria-hidden="true" />}
            label="Phone"
            value={user.phone_number || 'Not provided'}
          />
          <DetailItem
            icon={<MapPin className="size-4" aria-hidden="true" />}
            label="City"
            value={user.city || 'Not provided'}
          />
          <DetailItem
            icon={<Cake className="size-4" aria-hidden="true" />}
            label="Age"
            value={`${user.age} years`}
          />
        </div>
      </Card>

      <Card className="relative overflow-hidden border-primary-900 bg-gradient-to-br from-primary-800 to-primary-900 p-6 text-white sm:p-7">
        <div className="grid-pattern absolute inset-0 opacity-50" />
        <div className="absolute -right-10 -top-12 size-40 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative flex h-full flex-col">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20">
            <ShieldCheck className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-2xl font-extrabold">Keep your profile current</h2>
          <p className="mt-3 text-sm leading-6 text-blue-100">
            Review your contact information and update it whenever something changes.
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-100">
            <CalendarDays className="size-4" aria-hidden="true" />
            Member since {formatDate(user.created_at)}
          </div>
          <Link
            to="/profile"
            className="mt-7 inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-primary-900 shadow-sm transition hover:bg-blue-50 focus-visible:outline-white lg:mt-auto"
          >
            Review profile <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </section>
  );
}

function AdminQuickActions() {
  const actions = [
    {
      to: '/users' as const,
      title: 'Manage users',
      description: 'Create, filter, edit, or deactivate workspace accounts.',
      icon: UsersRound,
      iconClass: 'bg-blue-50 text-primary-700',
    },
    {
      to: '/profile' as const,
      title: 'My profile',
      description: 'Keep your own account details and password up to date.',
      icon: UserRound,
      iconClass: 'bg-emerald-50 text-emerald-700',
    },
  ];

  return (
    <section aria-labelledby="quick-access-title">
      <div className="mb-4">
        <h2 id="quick-access-title" className="text-xl font-extrabold text-ink">
          Quick access
        </h2>
        <p className="mt-1 text-sm text-slate-600">Jump back into your most-used tools.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {actions.map(({ to, title, description, icon: Icon, iconClass }) => (
          <Link key={to} to={to} className="group rounded-2xl focus-visible:outline-none">
            <Card className="flex h-full items-center gap-4 p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-primary-100 group-hover:shadow-float group-focus-visible:ring-4 group-focus-visible:ring-primary-100">
              <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${iconClass}`}>
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-ink">{title}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p>
              </div>
              <ArrowRight
                className="size-5 shrink-0 text-slate-500 transition group-hover:translate-x-1 group-hover:text-primary-700"
                aria-hidden="true"
              />
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function DashboardPage() {
  useCurrentUser();
  const user = useAuthStore((state) => state.user);
  if (!user) return null;

  return (
    <div className="animate-fade-up space-y-7 sm:space-y-8">
      <DashboardHero user={user} />
      {user.type === 'admin' ? (
        <>
          <StatsCards />
          <AdminQuickActions />
        </>
      ) : (
        <ClientOverview user={user} />
      )}
    </div>
  );
}
