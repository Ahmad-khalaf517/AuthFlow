import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/test/handlers';
import { createAdmin, createUsersResponse } from '@/test/factories';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';
import { UsersManagementPage } from './UsersManagementPage';

vi.mock('@tanstack/react-router', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect" data-to={to} />,
}));

describe('UsersManagementPage', () => {
  it('debounces filters, resets pages, paginates, changes limits, and opens creation', async () => {
    const requests: URL[] = [];
    server.use(
      http.get(`${api}/users`, ({ request }) => {
        requests.push(new URL(request.url));
        return HttpResponse.json(createUsersResponse({ total: 30, total_pages: 3 }));
      }),
    );
    useAuthStore.setState({
      isAuthenticated: true,
      isHydrated: true,
      user: createAdmin(),
    });
    const user = userEvent.setup();
    renderWithProviders(<UsersManagementPage />);
    await screen.findByText('Ahmad Khalaf');
    expect(requests.at(-1)?.searchParams.get('page')).toBe('1');

    await user.type(screen.getByLabelText('Filter by city'), 'Beirut');
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('city')).toBe('Beirut'), {
      timeout: 1500,
    });
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('page')).toBe('2'));

    await user.selectOptions(screen.getByLabelText('Rows per page'), '25');
    await waitFor(() => {
      expect(requests.at(-1)?.searchParams.get('page')).toBe('1');
      expect(requests.at(-1)?.searchParams.get('limit')).toBe('25');
    });

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(requests.at(-1)?.searchParams.has('city')).toBe(false), {
      timeout: 1500,
    });
    await user.click(screen.getByRole('button', { name: 'Create user' }));
    expect(screen.getByRole('heading', { name: 'Create a new user' })).toBeInTheDocument();
  });
});
