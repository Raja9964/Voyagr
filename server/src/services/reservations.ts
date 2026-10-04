import type { ReservationWithTrip } from '../domain/types.ts';
import { ConflictError, NotFoundError } from '../errors.ts';
import type { Repositories, Store } from '../repositories/types.ts';

export interface BookingRequest {
  userId: number;
  tripId: number;
  seats: number;
}

async function requireReservation(repos: Repositories, id: number): Promise<ReservationWithTrip> {
  const reservation = await repos.reservations.findWithTrip(id);
  if (!reservation) throw new NotFoundError(`Reservation ${id} not found`);
  return reservation;
}

const toPaise = (rupees: number) => Math.round(rupees * 100);

export function createReservationService(store: Store) {
  return {
    book({ userId, tripId, seats }: BookingRequest): Promise<ReservationWithTrip> {
      return store.transaction(async (tx) => {
        const user = await tx.users.findById(userId);
        if (!user) throw new NotFoundError(`User ${userId} not found`);

        // Row lock on the trip: concurrent bookings for it queue here until we commit,
        // so the seat check below always sees the latest count.
        const trip = await tx.trips.findById(tripId, { lock: true });
        if (!trip) throw new NotFoundError(`Trip ${tripId} not found`);
        if (trip.departureTime <= new Date()) {
          throw new ConflictError('This trip has already departed');
        }
        if (trip.seatsAvailable < seats) {
          throw new ConflictError(
            trip.seatsAvailable === 0
              ? 'This trip is sold out'
              : `Only ${trip.seatsAvailable} seat${trip.seatsAvailable === 1 ? '' : 's'} left on this trip`,
          );
        }

        await tx.trips.adjustSeats(trip.id, -seats);
        const id = await tx.reservations.create({
          userId,
          tripId,
          seats,
          totalPrice: (toPaise(trip.price) * seats) / 100,
        });
        return requireReservation(tx, id);
      });
    },

    cancel(id: number): Promise<ReservationWithTrip> {
      return store.transaction(async (tx) => {
        const reservation = await tx.reservations.findById(id, { lock: true });
        if (!reservation) throw new NotFoundError(`Reservation ${id} not found`);
        if (reservation.status === 'cancelled') {
          throw new ConflictError('This reservation is already cancelled');
        }

        const trip = await tx.trips.findById(reservation.tripId, { lock: true });
        if (!trip) throw new NotFoundError(`Trip ${reservation.tripId} not found`);
        if (trip.departureTime <= new Date()) {
          throw new ConflictError('Reservations can only be cancelled before departure');
        }

        await tx.reservations.markCancelled(id);
        await tx.trips.adjustSeats(trip.id, reservation.seats);
        return requireReservation(tx, id);
      });
    },

    get(id: number): Promise<ReservationWithTrip> {
      return requireReservation(store, id);
    },

    async listForUser(userId: number): Promise<ReservationWithTrip[]> {
      const user = await store.users.findById(userId);
      if (!user) throw new NotFoundError(`User ${userId} not found`);
      return store.reservations.listByUser(userId);
    },
  };
}

export type ReservationService = ReturnType<typeof createReservationService>;
