import { Outlet } from '@tanstack/react-router';
import { BarChart3, LockKeyhole, Sparkles, Users } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const features = [
  {
    icon: LockKeyhole,
    label: 'Secure by design',
    detail: 'Token-based access with strict role controls',
  },
  { icon: Users, label: 'People, organized', detail: 'One clear view of every account' },
  { icon: BarChart3, label: 'Insight at a glance', detail: 'Live metrics that stay useful' },
];

export function AuthLayout() {
  return (
    <main className="min-h-screen bg-[#f7f8fb] lg:grid lg:grid-cols-[minmax(360px,0.9fr)_minmax(560px,1.1fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#17356f] p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="grid-pattern absolute inset-0" />
        <div className="absolute -right-24 -top-32 size-[420px] rounded-full bg-blue-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 size-[420px] rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative z-10">
          <Logo light />
        </div>
        <div className="relative z-10 my-auto max-w-lg py-16">
          <p className="mb-5 text-xs font-bold uppercase tracking-[0.22em] text-blue-200">
            Identity, simplified
          </p>
          <h1 className="text-balance text-4xl font-extrabold leading-[1.12] xl:text-5xl">
            The calm, clear way to manage access.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-blue-100/80">
            AuthFlow brings secure sign-in, profile management, and team administration into one
            focused workspace.
          </p>
          <div className="mt-10 space-y-4">
            {features.map(({ icon: Icon, label, detail }) => (
              <div
                key={label}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10">
                  <Icon className="size-5 text-blue-100" />
                </div>
                <div>
                  <p className="font-bold">{label}</p>
                  <p className="mt-0.5 text-sm text-blue-100/65">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 flex items-center gap-2 text-xs font-semibold text-blue-100/60">
          <Sparkles className="size-4" /> Built for teams that value clarity.
        </p>
      </section>
      <section className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-5 py-5 lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10 lg:px-14">
          <div className="w-full max-w-[500px] animate-fade-up">
            <Outlet />
          </div>
        </div>
        <p className="px-5 pb-6 text-center text-xs text-slate-600">
          Protected by AuthFlow · Secure authentication
        </p>
      </section>
    </main>
  );
}
