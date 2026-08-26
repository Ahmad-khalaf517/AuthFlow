import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/cn';
import { createUser } from '@/test/factories';
import { describedBy } from './form';
import { formatAverageAge, formatDate, getFullName, getInitials } from './formatters';

describe('display helpers', () => {
  const user = createUser({ first_name: 'ahmad', last_name: 'khalaf' });

  it('formats names and initials', () => {
    expect(getInitials(user)).toBe('AK');
    expect(getFullName(user)).toBe('ahmad khalaf');
  });

  it('formats dates and average ages', () => {
    expect(formatDate('2025-01-15T10:00:00.000Z')).toMatch(/Jan 15, 2025/);
    expect(formatAverageAge(31)).toBe('31');
    expect(formatAverageAge(31.46)).toBe('31.5');
  });

  it('selects the correct accessible description', () => {
    expect(describedBy('email', true, true)).toBe('email-error');
    expect(describedBy('email', false, true)).toBe('email-hint');
    expect(describedBy('email', false)).toBeUndefined();
  });

  it('merges Tailwind classes with later classes winning', () => {
    expect(cn('px-2 text-red-500', undefined, 'px-4')).toBe('text-red-500 px-4');
  });
});
