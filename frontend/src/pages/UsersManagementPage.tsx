import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { UserDialog } from '@/components/admin/UserDialog';
import { UsersTable } from '@/components/admin/UsersTable';
import { UsersTableToolbar } from '@/components/admin/UsersTableToolbar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useUsers } from '@/hooks/useUsers';
import { useUiStore } from '@/store/uiStore';
import type { UsersFilters } from '@/types/user';

export function UsersManagementPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState<UsersFilters>({});
  const debouncedFilters = useDebouncedValue(filters);
  const users = useUsers({ page, limit, ...debouncedFilters });
  const openUserDialog = useUiStore((state) => state.openUserDialog);
  const updateFilters = (next: UsersFilters) => {
    setFilters(next);
    setPage(1);
  };
  return (
    <ProtectedRoute adminOnly>
      <div className="space-y-7 animate-fade-up">
        <PageHeader
          eyebrow="Administration"
          title="User management"
          description="Manage access, account details, and roles across your workspace."
          action={
            <Button onClick={() => openUserDialog()}>
              <UserPlus className="size-4" />
              Create user
            </Button>
          }
        />
        <UsersTable
          data={users.data}
          isLoading={users.isLoading}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
          toolbar={<UsersTableToolbar filters={filters} onChange={updateFilters} />}
        />
        <UserDialog />
      </div>
    </ProtectedRoute>
  );
}
