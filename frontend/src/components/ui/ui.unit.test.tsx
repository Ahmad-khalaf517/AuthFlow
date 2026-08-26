import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useUiStore } from '@/store/uiStore';
import { Button } from './Button';
import { FormField } from './Form';
import { Input } from './Input';
import { Toaster } from './Toast';

describe('UI primitives', () => {
  it('disables a loading button and keeps its accessible name', () => {
    render(<Button isLoading>Save changes</Button>);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('connects labels, errors, hints, and invalid input state', () => {
    const { rerender } = render(
      <FormField label="Email" htmlFor="email" error="Email is required">
        <Input id="email" hasError aria-describedby="email-error" />
      </FormField>,
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Email is required');

    rerender(
      <FormField label="Password" htmlFor="password" hint="Use 8 characters" optional>
        <Input id="password" aria-describedby="password-hint" />
      </FormField>,
    );
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.getByText('Use 8 characters')).toHaveAttribute('id', 'password-hint');
  });

  it('renders toast roles and dismisses a notification', async () => {
    useUiStore.setState({
      toasts: [
        { id: 'success', message: 'Saved', type: 'success' },
        { id: 'error', message: 'Failed', type: 'error' },
      ],
    });
    render(<Toaster />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    expect(screen.getByRole('alert')).toHaveTextContent('Failed');
    await userEvent.click(screen.getAllByRole('button', { name: 'Dismiss notification' })[0]!);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});
