import { z } from 'zod';

const requiredText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(100, `${label} must be 100 characters or less`);

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .email('Enter a valid email');

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\+?[1-9]\d{7,14}$/, 'Use a valid number, such as +96170123456');

export const ageSchema = z.coerce
  .number<number>({ error: 'Age is required' })
  .int('Age must be a whole number')
  .min(1, 'Age must be at least 1')
  .max(120, 'Age must be 120 or less');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/\d/, 'Password must contain at least one number');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const userFieldsSchema = z.object({
  first_name: requiredText('First name'),
  last_name: requiredText('Last name'),
  email: emailSchema,
  phone_number: phoneSchema,
  city: requiredText('City'),
  age: ageSchema,
  password: passwordSchema,
});

export const registerSchema = userFieldsSchema
  .extend({ confirm_password: z.string().min(1, 'Confirm your password') })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export const profileSchema = userFieldsSchema.omit({ password: true }).extend({
  password: z.union([z.literal(''), passwordSchema]),
});

export const adminUserSchema = userFieldsSchema.extend({
  type: z.enum(['admin', 'client']),
});

export const adminUserEditSchema = profileSchema.extend({
  type: z.enum(['admin', 'client']),
});

export type LoginFormValues = z.output<typeof loginSchema>;
export type RegisterFormValues = z.output<typeof registerSchema>;
export type ProfileFormValues = z.output<typeof profileSchema>;
export type AdminUserFormValues = z.output<typeof adminUserSchema>;
export type AdminUserEditFormValues = z.output<typeof adminUserEditSchema>;
