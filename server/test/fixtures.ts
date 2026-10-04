import type { Trip, User } from '../src/domain/types.ts';

const HOUR = 60 * 60 * 1000;

export const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR);

export function makeTrip(overrides: Partial<Trip> & Pick<Trip, 'id'>): Trip {
  const departureTime = overrides.departureTime ?? hoursFromNow(48);
  return {
    mode: 'flight',
    operator: 'Skyline Air',
    code: `SK ${overrides.id}`,
    origin: 'Bengaluru',
    destination: 'Mumbai',
    arrivalTime: new Date(departureTime.getTime() + 2 * HOUR),
    price: 4500,
    seatCapacity: 180,
    seatsAvailable: 20,
    ...overrides,
    departureTime,
  };
}

export const asha: User = {
  id: 1,
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+91 98450 12345',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};
