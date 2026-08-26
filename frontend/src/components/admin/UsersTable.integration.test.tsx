import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useUiStore } from '@/store/uiStore';
import { api } from '@/test/handlers';
import { createUser, createUsersResponse } from '@/test/factories';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { UsersTable } from './UsersTable';

const baseProps = {
  isLoading: false,
  page: 1,
  limit: 10,
  onPageChange: vi.fn(),
  onLimitChange: vi.fn(),
  toolbar: <div>Filters</div>,
};

describe('UsersTable', () => {
  it('renders loading and empty states', () => {
    const { rerender } = renderWithProviders(<UsersTable {...baseProps} isLoading />);
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(5);
    rerender(
      <UsersTable
        {...baseProps}
        data={createUsersResponse({ users: [], total: 0, total_pages: 0 })}
      />,
    );
    expect(screen.getByText('No users found')).toBeInTheDocument();
    expect(screen.getByText('Page 0 of 0')).toBeInTheDocument();
  });

  it('renders users, edits, changes pages and page size', async () => {
    const onPageChange = vi.fn();
    const onLimitChange = vi.fn();
    const user = createUser();
    renderWithProviders(
      <UsersTable
        {...baseProps}
        data={createUsersResponse({ total: 20, total_pages: 2 })}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />,
    );
    expect(screen.getByText('Ahmad Khalaf')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Edit Ahmad Khalaf' }));
    expect(useUiStore.getState()).toMatchObject({ isUserDialogOpen: true, selectedUser: user });
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '25');
    expect(onLimitChange).toHaveBeenCalledWith(25);
  });

  it('confirms deactivation and reports success', async () => {
    const deleted = vi.fn();
    server.use(
      http.delete(`${api}/users/:id`, ({ params }) => {
        deleted(String(params.id));
        return HttpResponse.json(createUser({ is_deleted: true }));
      }),
    );
    renderWithProviders(<UsersTable {...baseProps} data={createUsersResponse()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Ahmad Khalaf' }));
    expect(screen.getByRole('heading', { name: 'Deactivate user' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate user' }));
    await waitFor(() => expect(deleted).toHaveBeenCalledWith('user-1'));
    expect(useUiStore.getState().toasts.at(-1)).toMatchObject({
      message: 'Ahmad Khalaf was deactivated.',
      type: 'success',
    });
  });

  it('shows a deletion API error and keeps the confirmation open', async () => {
    server.use(
      http.delete(`${api}/users/:id`, () =>
        HttpResponse.json({ detail: 'Cannot deactivate yourself' }, { status: 400 }),
      ),
    );
    renderWithProviders(<UsersTable {...baseProps} data={createUsersResponse()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Ahmad Khalaf' }));
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate user' }));
    await waitFor(() =>
      expect(useUiStore.getState().toasts.at(-1)).toMatchObject({
        message: 'Cannot deactivate yourself',
        type: 'error',
      }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
