import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(2, 'Name must be at least 2 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const shipmentSchema = z.object({
  origin_address: z.string().min(1, 'Origin address required'),
  destination_address: z.string().min(1, 'Destination address required'),
  weight_kg: z.number().positive('Weight must be positive'),
  description: z.string().optional(),
  estimated_delivery: z.coerce.date().nullable().optional(),
  origin_latitude: z.number().min(-90, 'Origin latitude must be >= -90').max(90, 'Origin latitude must be <= 90').nullable().optional(),
  origin_longitude: z.number().min(-180, 'Origin longitude must be >= -180').max(180, 'Origin longitude must be <= 180').nullable().optional(),
  destination_latitude: z.number().min(-90, 'Destination latitude must be >= -90').max(90, 'Destination latitude must be <= 90').nullable().optional(),
  destination_longitude: z.number().min(-180, 'Destination longitude must be >= -180').max(180, 'Destination longitude must be <= 180').nullable().optional(),
}).refine((data) => (data.origin_latitude == null) === (data.origin_longitude == null), {
  message: 'Origin latitude and longitude must be provided together',
  path: ['origin_latitude'],
}).refine((data) => (data.destination_latitude == null) === (data.destination_longitude == null), {
  message: 'Destination latitude and longitude must be provided together',
  path: ['destination_latitude'],
});

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const newPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});
