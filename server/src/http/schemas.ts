import { z } from 'zod';
import { MAX_SEATS_PER_BOOKING, TRAVEL_MODES, TRIP_SORTS } from '../domain/types.ts';

export const idSchema = z.coerce.number().int().positive().max(4_294_967_295);

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

const seatsSchema = z.coerce.number().int().min(1).max(MAX_SEATS_PER_BOOKING);

const optionalText = z.string().trim().min(1).max(80).optional();

// Accepts ?mode=flight,train as well as ?mode=flight&mode=train.
const modesSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value),
  z.array(z.enum(TRAVEL_MODES)).optional(),
);

export const tripSearchSchema = z.object({
  from: optionalText,
  to: optionalText,
  date: z.iso.date().optional(),
  mode: modesSchema,
  maxPrice: z.coerce.number().positive().optional(),
  seats: seatsSchema.optional(),
  sort: z.enum(TRIP_SORTS).default('departure'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const registerUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 -]{6,18}$/, 'Enter a valid phone number')
    .nullish()
    .transform((value) => value ?? null),
});

export const userLookupSchema = z.object({
  email: emailSchema,
});

export const createReservationSchema = z.object({
  userId: idSchema,
  tripId: idSchema,
  seats: seatsSchema,
});
