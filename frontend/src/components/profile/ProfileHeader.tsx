import { Badge } from '@/components/ui/Badge';
import type { User } from '@/types/user';
import { getFullName, getInitials } from '@/utils/formatters';

export function ProfileHeader({ user }: { user: User }) {
  return (
    <div className="flex flex-col gap-5 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:p-7">
      <div className="grid size-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-900 text-2xl font-extrabold text-white shadow-lg shadow-blue-200">
        {getInitials(user)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="truncate text-2xl font-extrabold text-ink">{getFullName(user)}</h2>
          <Badge tone={user.type === 'admin' ? 'blue' : 'green'}>{user.type}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        <p className="mt-2 text-xs text-slate-600">
          Your initials are used in place of a profile image.
        </p>
      </div>
    </div>
  );
}
