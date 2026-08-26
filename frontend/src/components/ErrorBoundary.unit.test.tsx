import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function BrokenComponent(): never {
  throw new Error('render failed');
}

describe('ErrorBoundary', () => {
  it('renders children while the tree is healthy', () => {
    render(<ErrorBoundary>Healthy content</ErrorBoundary>);
    expect(screen.getByText('Healthy content')).toBeInTheDocument();
  });

  it('shows a recoverable fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole('heading', { name: 'This page could not be displayed.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh page' })).toBeInTheDocument();
  });
});
