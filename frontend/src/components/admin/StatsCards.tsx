import { Building2, Cake, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { useAverageAge, useTopCities, useUserCount } from '@/hooks/useStats';
import { formatAverageAge } from '@/utils/formatters';

function StatSkeleton() {
  return (
    <div className="animate-pulse" aria-label="Loading statistic">
      <div className="h-9 w-24 rounded-lg bg-slate-100" />
      <div className="mt-3 h-4 w-32 rounded bg-slate-100" />
    </div>
  );
}

function StatCard({
  icon,
  iconClass,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  children: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div className={`absolute -right-10 -top-10 size-32 rounded-full opacity-60 ${iconClass}`} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">{children}</div>
        <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${iconClass}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function StatsCards() {
  const count = useUserCount();
  const age = useAverageAge();
  const cities = useTopCities();
  const highestCityCount = Math.max(...(cities.data?.cities.map((item) => item.count) ?? [1]));

  return (
    <section aria-labelledby="stats-title" aria-live="polite">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 id="stats-title" className="text-xl font-extrabold text-ink">
            Workspace pulse
          </h2>
          <p className="mt-1 text-sm text-slate-600">Live data from active accounts.</p>
        </div>
        <span className="hidden items-center gap-2 text-xs font-extrabold text-emerald-700 sm:flex">
          <span className="size-2 rounded-full bg-emerald-600" aria-hidden="true" />
          Live data
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<UsersRound className="size-5" aria-hidden="true" />}
          iconClass="bg-blue-50 text-primary-700"
        >
          {count.isLoading ? (
            <StatSkeleton />
          ) : (
            <>
              <p className="text-3xl font-extrabold text-ink">
                {count.isError ? 'Unavailable' : (count.data?.total_users ?? '—')}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600">Active users</p>
              <p className="mt-1 text-xs text-slate-600">Accounts currently in the workspace</p>
            </>
          )}
        </StatCard>

        <StatCard
          icon={<Cake className="size-5" aria-hidden="true" />}
          iconClass="bg-amber-50 text-amber-800"
        >
          {age.isLoading ? (
            <StatSkeleton />
          ) : (
            <>
              <p className="text-3xl font-extrabold text-ink">
                {age.isError
                  ? 'Unavailable'
                  : age.data
                    ? formatAverageAge(age.data.average_age)
                    : '—'}
                {!age.isError && age.data ? (
                  <span className="ml-1 text-base font-bold text-slate-600"> years</span>
                ) : null}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600">Average age</p>
              <p className="mt-1 text-xs text-slate-600">Across active user profiles</p>
            </>
          )}
        </StatCard>

        <StatCard
          icon={<Building2 className="size-5" aria-hidden="true" />}
          iconClass="bg-emerald-50 text-emerald-700"
        >
          {cities.isLoading ? (
            <StatSkeleton />
          ) : cities.isError ? (
            <p className="text-sm font-semibold text-slate-600">City data is unavailable</p>
          ) : cities.data?.cities.length ? (
            <ol className="space-y-3" aria-label="Top cities by user count">
              {cities.data.cities.map((item, index) => (
                <li key={item.city}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="grid size-5 place-items-center rounded-md bg-emerald-50 text-[10px] font-extrabold text-emerald-800">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-bold text-ink">{item.city}</span>
                    <span className="text-xs font-extrabold text-slate-600">
                      {item.count} {item.count === 1 ? 'user' : 'users'}
                    </span>
                  </div>
                  <div className="ml-7 mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${Math.max(12, (item.count / highestCityCount) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm font-semibold text-slate-600">No city data yet</p>
          )}
          <p className="mt-3 text-sm font-semibold text-slate-600">Top cities</p>
        </StatCard>
      </div>
    </section>
  );
}
