import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UserRole, UsersFilters } from '@/types/user';

interface UsersTableToolbarProps {
  filters: UsersFilters;
  onChange: (filters: UsersFilters) => void;
}

export function UsersTableToolbar({ filters, onChange }: UsersTableToolbarProps) {
  const setText = (key: keyof UsersFilters, value: string) =>
    onChange({ ...filters, [key]: value || undefined });
  const hasFilters = Object.values(filters).some((value) => value !== undefined && value !== '');
  return (
    <div className="border-b border-slate-100 p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr_1fr_100px_130px_auto]">
        <Input
          aria-label="Filter by first name"
          placeholder="First name"
          value={filters.first_name ?? ''}
          onChange={(e) => setText('first_name', e.target.value)}
        />
        <Input
          aria-label="Filter by last name"
          placeholder="Last name"
          value={filters.last_name ?? ''}
          onChange={(e) => setText('last_name', e.target.value)}
        />
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Filter by email"
            className="pl-10"
            placeholder="Email contains…"
            value={filters.email ?? ''}
            onChange={(e) => setText('email', e.target.value)}
          />
        </div>
        <Input
          aria-label="Filter by city"
          placeholder="City"
          value={filters.city ?? ''}
          onChange={(e) => setText('city', e.target.value)}
        />
        <Input
          aria-label="Filter by exact age"
          type="number"
          min={1}
          max={120}
          placeholder="Age"
          value={filters.age ?? ''}
          onChange={(e) =>
            onChange({ ...filters, age: e.target.value ? Number(e.target.value) : undefined })
          }
        />
        <select
          aria-label="Filter by role"
          className="h-11 rounded-xl border bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-100"
          value={filters.type ?? ''}
          onChange={(e) =>
            onChange({ ...filters, type: (e.target.value || undefined) as UserRole | undefined })
          }
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="client">Client</option>
        </select>
        <Button type="button" variant="ghost" onClick={() => onChange({})} disabled={!hasFilters}>
          <RotateCcw className="size-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
