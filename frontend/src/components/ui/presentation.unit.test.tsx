import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createAdmin, createUser } from '@/test/factories';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { Badge } from './Badge';
import { Card, CardContent, CardHeader } from './Card';
import { Logo } from './Logo';
import { PageHeader } from './PageHeader';

describe('presentation components', () => {
  it('renders card sections with custom classes', () => {
    render(
      <Card className="custom-card">
        <CardHeader className="custom-header">Heading</CardHeader>
        <CardContent className="custom-content">Content</CardContent>
      </Card>,
    );
    expect(screen.getByText('Heading').parentElement).toHaveClass('custom-card');
    expect(screen.getByText('Heading')).toHaveClass('custom-header');
    expect(screen.getByText('Content')).toHaveClass('custom-content');
  });

  it.each(['blue', 'green', 'gray', 'red'] as const)('renders the %s badge tone', (tone) => {
    render(<Badge tone={tone}>{tone}</Badge>);
    expect(screen.getByText(tone)).toBeInTheDocument();
  });

  it('renders page header optional content in both states', () => {
    const { rerender } = render(<PageHeader title="Users" description="Manage people" />);
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    rerender(
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Manage people"
        action={<button>Add</button>}
      />,
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('renders normal and light logos', () => {
    const { rerender } = render(<Logo />);
    expect(screen.getByText('AuthFlow')).toBeInTheDocument();
    rerender(<Logo light />);
    expect(screen.getByText('AuthFlow')).toBeInTheDocument();
  });

  it('shows client and admin profile identities', () => {
    const { rerender } = render(<ProfileHeader user={createUser()} />);
    expect(screen.getByText('client')).toBeInTheDocument();
    rerender(<ProfileHeader user={createAdmin()} />);
    expect(screen.getByText('admin')).toBeInTheDocument();
  });
});
