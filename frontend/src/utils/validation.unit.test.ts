import { describe, expect, it } from 'vitest';
import {
  adminUserEditSchema,
  adminUserSchema,
  ageSchema,
  emailSchema,
  loginSchema,
  passwordSchema,
  phoneSchema,
  profileSchema,
  registerSchema,
} from './validation';

const validUser = {
  first_name: '  Ahmad  ',
  last_name: 'Khalaf',
  email: ' ahmad@example.com ',
  phone_number: '+96170123456',
  city: 'Beirut',
  age: 28,
  password: 'password1',
};

describe('validation schemas', () => {
  it.each([
    ['', 'Email is required'],
    ['not-an-email', 'Enter a valid email'],
  ])('rejects invalid email %j', (value, message) => {
    expect(emailSchema.safeParse(value).error?.issues[0]?.message).toBe(message);
  });

  it('trims a valid email', () => {
    expect(emailSchema.parse('  person@example.com ')).toBe('person@example.com');
  });

  it.each(['+96170123456', '12025550123'])('accepts valid phone %s', (phone) => {
    expect(phoneSchema.safeParse(phone).success).toBe(true);
  });

  it.each(['', '01234567', '+123'])('rejects invalid phone %j', (phone) => {
    expect(phoneSchema.safeParse(phone).success).toBe(false);
  });

  it.each([
    ['28', 28],
    [1, 1],
    [120, 120],
  ])('coerces and accepts age %j', (value, expected) => {
    expect(ageSchema.parse(value)).toBe(expected);
  });

  it.each([0, 121, 1.5, 'unknown'])('rejects invalid age %j', (age) => {
    expect(ageSchema.safeParse(age).success).toBe(false);
  });

  it.each(['short1', 'onlyletters', '12345678'])('rejects weak password %s', (password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false);
  });

  it('validates login credentials', () => {
    expect(loginSchema.safeParse({ email: 'person@example.com', password: 'x' }).success).toBe(
      true,
    );
    expect(loginSchema.safeParse({ email: '', password: '' }).success).toBe(false);
  });

  it('requires matching registration passwords and returns normalized data', () => {
    expect(
      registerSchema.safeParse({ ...validUser, confirm_password: 'different1' }).error?.issues[0]
        ?.message,
    ).toBe('Passwords do not match');
    const result = registerSchema.parse({ ...validUser, confirm_password: 'password1' });
    expect(result.first_name).toBe('Ahmad');
    expect(result.email).toBe('ahmad@example.com');
  });

  it('allows a blank profile password but validates a supplied one', () => {
    expect(profileSchema.safeParse({ ...validUser, password: '' }).success).toBe(true);
    expect(profileSchema.safeParse({ ...validUser, password: 'weak' }).success).toBe(false);
  });

  it('requires valid admin roles for create and edit', () => {
    expect(adminUserSchema.safeParse({ ...validUser, type: 'admin' }).success).toBe(true);
    expect(
      adminUserEditSchema.safeParse({ ...validUser, password: '', type: 'client' }).success,
    ).toBe(true);
    expect(adminUserSchema.safeParse({ ...validUser, type: 'owner' }).success).toBe(false);
  });
});
