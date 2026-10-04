import type { Store } from '../repositories/types.ts';
import { createReservationService } from './reservations.ts';
import { createTripService } from './trips.ts';
import { createUserService } from './users.ts';

export function createServices(store: Store) {
  return {
    users: createUserService(store),
    trips: createTripService(store),
    reservations: createReservationService(store),
  };
}

export type Services = ReturnType<typeof createServices>;
