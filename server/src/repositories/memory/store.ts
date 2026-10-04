import type { Reservation, ReservationWithTrip, Trip, TripSort, User } from '../../domain/types.ts';
import { ConflictError } from '../../errors.ts';
import type { Repositories, Store } from '../types.ts';

// Behaves like the MySQL store closely enough for route and service tests:
// transactions run one at a time and roll back on error.

interface State {
  users: Map<number, User>;
  trips: Map<number, Trip>;
  reservations: Map<number, Reservation>;
  nextUserId: number;
  nextReservationId: number;
}

export interface MemorySeed {
  users?: User[];
  trips?: Trip[];
  reservations?: Reservation[];
}

const durationOf = (trip: Trip) => trip.arrivalTime.getTime() - trip.departureTime.getTime();

const compareTrips: Record<TripSort, (a: Trip, b: Trip) => number> = {
  departure: (a, b) => a.departureTime.getTime() - b.departureTime.getTime() || a.id - b.id,
  price: (a, b) => a.price - b.price || compareTrips.departure(a, b),
  duration: (a, b) => durationOf(a) - durationOf(b) || compareTrips.departure(a, b),
};

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const maxId = (items: { id: number }[]) => items.reduce((max, item) => Math.max(max, item.id), 0);

export function createMemoryStore(seed: MemorySeed = {}): Store {
  let state: State = {
    users: new Map((seed.users ?? []).map((user) => [user.id, structuredClone(user)])),
    trips: new Map((seed.trips ?? []).map((trip) => [trip.id, structuredClone(trip)])),
    reservations: new Map((seed.reservations ?? []).map((r) => [r.id, structuredClone(r)])),
    nextUserId: maxId(seed.users ?? []) + 1,
    nextReservationId: maxId(seed.reservations ?? []) + 1,
  };

  const withTrip = (reservation: Reservation): ReservationWithTrip => {
    const trip = state.trips.get(reservation.tripId);
    if (!trip) throw new Error(`Trip ${reservation.tripId} missing for reservation ${reservation.id}`);
    return structuredClone({ ...reservation, trip });
  };

  const repositories: Repositories = {
    users: {
      async create(input) {
        if ([...state.users.values()].some((user) => sameText(user.email, input.email))) {
          throw new ConflictError('An account with this email already exists');
        }
        const user: User = { id: state.nextUserId++, ...input, createdAt: new Date() };
        state.users.set(user.id, user);
        return structuredClone(user);
      },

      async findById(id) {
        const user = state.users.get(id);
        return user ? structuredClone(user) : null;
      },

      async findByEmail(email) {
        const user = [...state.users.values()].find((u) => sameText(u.email, email));
        return user ? structuredClone(user) : null;
      },
    },

    trips: {
      async search(query) {
        return [...state.trips.values()]
          .filter(
            (trip) =>
              trip.departureTime >= query.departAfter &&
              (!query.departBefore || trip.departureTime < query.departBefore) &&
              (!query.origin || sameText(trip.origin, query.origin)) &&
              (!query.destination || sameText(trip.destination, query.destination)) &&
              (!query.modes?.length || query.modes.includes(trip.mode)) &&
              (query.maxPrice === undefined || trip.price <= query.maxPrice) &&
              (query.minSeats === undefined || trip.seatsAvailable >= query.minSeats),
          )
          .sort(compareTrips[query.sort])
          .slice(0, query.limit)
          .map((trip) => structuredClone(trip));
      },

      async findById(id) {
        const trip = state.trips.get(id);
        return trip ? structuredClone(trip) : null;
      },

      async adjustSeats(id, delta) {
        const trip = state.trips.get(id);
        if (!trip) throw new Error(`Trip ${id} not found`);
        const seats = trip.seatsAvailable + delta;
        // Mirrors the UNSIGNED column and CHECK constraint in schema.sql.
        if (seats < 0 || seats > trip.seatCapacity) {
          throw new Error(`Seat count for trip ${id} would become ${seats}`);
        }
        trip.seatsAvailable = seats;
      },

      async listCities() {
        const cities = new Set<string>();
        for (const trip of state.trips.values()) {
          cities.add(trip.origin).add(trip.destination);
        }
        return [...cities].sort((a, b) => a.localeCompare(b));
      },
    },

    reservations: {
      async create(input) {
        const reservation: Reservation = {
          id: state.nextReservationId++,
          ...input,
          status: 'confirmed',
          createdAt: new Date(),
          cancelledAt: null,
        };
        state.reservations.set(reservation.id, reservation);
        return reservation.id;
      },

      async findById(id) {
        const reservation = state.reservations.get(id);
        return reservation ? structuredClone(reservation) : null;
      },

      async findWithTrip(id) {
        const reservation = state.reservations.get(id);
        return reservation ? withTrip(reservation) : null;
      },

      async listByUser(userId) {
        return [...state.reservations.values()]
          .filter((reservation) => reservation.userId === userId)
          .map(withTrip)
          .sort((a, b) => compareTrips.departure(a.trip, b.trip) || a.id - b.id);
      },

      async markCancelled(id) {
        const reservation = state.reservations.get(id);
        if (!reservation) return;
        reservation.status = 'cancelled';
        reservation.cancelledAt = new Date();
      },
    },
  };

  let queue: Promise<unknown> = Promise.resolve();

  return {
    ...repositories,

    transaction(work) {
      const run = async () => {
        const snapshot = structuredClone(state);
        try {
          return await work(repositories);
        } catch (error) {
          state = snapshot;
          throw error;
        }
      };
      const result = queue.then(run);
      queue = result.catch(() => undefined);
      return result;
    },

    async ping() {},

    async close() {},
  };
}
