import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { User } from '@/types/user';
import { formatDate, getFullName, getInitials } from '@/utils/formatters';

export function getUserTableColumns(
  onEdit: (user: User) => void,
  onDelete: (user: User) => void,
): ColumnDef<User>[] {
  return [
    {
      accessorKey: 'first_name',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-50 text-xs font-extrabold text-primary-700">
            {getInitials(row.original)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{getFullName(row.original)}</p>
            <p className="truncate text-xs text-slate-500">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'city',
      header: 'Location',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-700">{row.original.city}</p>
          <p className="text-xs text-slate-400">Age {row.original.age}</p>
        </div>
      ),
    },
    {
      accessorKey: 'phone_number',
      header: 'Phone',
      cell: ({ getValue }) => <span className="text-sm text-slate-600">{getValue<string>()}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Role',
      cell: ({ getValue }) => {
        const role = getValue<User['type']>();
        return <Badge tone={role === 'admin' ? 'blue' : 'green'}>{role}</Badge>;
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ getValue }) => (
        <span className="text-sm text-slate-500">{formatDate(getValue<string>())}</span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => onEdit(row.original)}
            className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-primary-700"
            aria-label={`Edit ${getFullName(row.original)}`}
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => onDelete(row.original)}
            className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-danger"
            aria-label={`Delete ${getFullName(row.original)}`}
          >
            <Trash2 className="size-4" />
          </button>
          <MoreHorizontal className="hidden" />
        </div>
      ),
    },
  ];
}
