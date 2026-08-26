import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UsersTableToolbar } from './UsersTableToolbar';

describe('UsersTableToolbar', () => {
  it('updates text, age, and role filters and clears them', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<UsersTableToolbar filters={{}} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Filter by first name'), 'M');
    expect(onChange).toHaveBeenLastCalledWith({ first_name: 'M' });
    rerender(<UsersTableToolbar filters={{ first_name: 'M' }} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Filter by exact age'), { target: { value: '28' } });
    expect(onChange).toHaveBeenLastCalledWith({ first_name: 'M', age: 28 });
    await userEvent.selectOptions(screen.getByLabelText('Filter by role'), 'admin');
    expect(onChange).toHaveBeenLastCalledWith({ first_name: 'M', type: 'admin' });
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith({});
  });
});
