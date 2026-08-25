import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Trash2, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { useDeleteUser } from '@/hooks/useUsers';
import { useToast } from '@/hooks/useToast';
import { useUiStore } from '@/store/uiStore';
import type { User, UsersListResponse } from '@/types/user';
import { PAGE_SIZE_OPTIONS } from '@/utils/constants';
import { getFullName } from '@/utils/formatters';
import { getUserTableColumns } from './UserTableColumns';

interface UsersTableProps {
  data?: UsersListResponse;
  isLoading: boolean;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  toolbar: React.ReactNode;
}

function RowsSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <tr key={index} className="border-t">
          <td colSpan={6} className="p-4">
            <div className="flex animate-pulse items-center gap-3">
              <div className="size-9 rounded-xl bg-slate-100" />
              <div className="h-4 w-1/3 rounded bg-slate-100" />
              <div className="ml-auto h-4 w-20 rounded bg-slate-100" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function UsersTable({
  data,
  isLoading,
  page,
  limit,
  onPageChange,
  onLimitChange,
  toolbar,
}: UsersTableProps) {
  const openUserDialog = useUiStore((state) => state.openUserDialog);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const remove = useDeleteUser();
  const { toast } = useToast();
  const columns = useMemo(
    () => getUserTableColumns(openUserDialog, setDeleteTarget),
    [openUserDialog],
  );
  const table = useReactTable({
    data: data?.users ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast(`${getFullName(deleteTarget)} was deactivated.`, 'success');
      setDeleteTarget(null);
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Unable to deactivate this user.', 'error');
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        {toolbar}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/70">
                {table.getHeaderGroups()[0]?.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <RowsSkeleton />
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50/60"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                      <UsersRound className="size-6" />
                    </div>
                    <p className="mt-4 font-bold text-ink">No users found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Adjust the filters or create a new user.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-4 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-ink">{data?.total ?? 0}</span> total users
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="page-size" className="text-sm text-slate-500">
              Rows per page
            </label>
            <select
              id="page-size"
              className="h-9 rounded-lg border bg-white px-2 text-sm font-semibold"
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span className="min-w-24 text-center text-sm font-semibold text-slate-600">
              Page {data?.total_pages ? page : 0} of {data?.total_pages ?? 0}
            </span>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="size-9"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1 || isLoading}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="size-9"
                onClick={() => onPageChange(page + 1)}
                disabled={!data?.total_pages || page >= data.total_pages || isLoading}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Deactivate user"
        description="This performs a soft delete and immediately blocks sign-in."
      >
        <div className="p-5 sm:p-6">
          <div className="flex gap-4 rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-danger">
              <Trash2 className="size-5" />
            </div>
            <p className="text-sm leading-6 text-red-900">
              Deactivate <strong>{deleteTarget ? getFullName(deleteTarget) : ''}</strong>? There is
              no restore endpoint. This can only be undone by an administrator editing the database
              record directly.
            </p>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={remove.isPending} onClick={confirmDelete}>
              Deactivate user
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
