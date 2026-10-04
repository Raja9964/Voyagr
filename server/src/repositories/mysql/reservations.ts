import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Reservation, ReservationStatus, ReservationWithTrip } from '../../domain/types.ts';
import type { ReservationRepository } from '../types.ts';
import type { Queryable } from './queryable.ts';
import { TRIP_COLUMNS, toTrip, type TripRow } from './trips.ts';

interface ReservationRow extends RowDataPacket {
  id: number;
  user_id: number;
  trip_id: number;
  seats: number;
  total_price: number;
  status: ReservationStatus;
  created_at: Date;
  cancelled_at: Date | null;
}

// Trip columns keep their names; reservation columns that would clash are aliased.
interface ReservationTripRow extends TripRow {
  reservation_id: number;
  user_id: number;
  seats: number;
  total_price: number;
  status: ReservationStatus;
  created_at: Date;
  cancelled_at: Date | null;
}

const toReservation = (row: ReservationRow): Reservation => ({
  id: row.id,
  userId: row.user_id,
  tripId: row.trip_id,
  seats: row.seats,
  totalPrice: row.total_price,
  status: row.status,
  createdAt: row.created_at,
  cancelledAt: row.cancelled_at,
});

const toReservationWithTrip = (row: ReservationTripRow): ReservationWithTrip => ({
  id: row.reservation_id,
  userId: row.user_id,
  tripId: row.id,
  seats: row.seats,
  totalPrice: row.total_price,
  status: row.status,
  createdAt: row.created_at,
  cancelledAt: row.cancelled_at,
  trip: toTrip(row),
});

const SELECT_WITH_TRIP = `
  SELECT r.id AS reservation_id, r.user_id, r.seats, r.total_price, r.status,
         r.created_at, r.cancelled_at, ${TRIP_COLUMNS}
    FROM reservations r
    JOIN trips t ON t.id = r.trip_id`;

export function createReservationRepository(db: Queryable): ReservationRepository {
  return {
    async create({ userId, tripId, seats, totalPrice }) {
      const [result] = await db.query<ResultSetHeader>(
        'INSERT INTO reservations (user_id, trip_id, seats, total_price) VALUES (?, ?, ?, ?)',
        [userId, tripId, seats, totalPrice],
      );
      return result.insertId;
    },

    async findById(id, { lock = false } = {}) {
      const [rows] = await db.query<ReservationRow[]>(
        `SELECT id, user_id, trip_id, seats, total_price, status, created_at, cancelled_at
           FROM reservations
          WHERE id = ?${lock ? ' FOR UPDATE' : ''}`,
        [id],
      );
      return rows[0] ? toReservation(rows[0]) : null;
    },

    async findWithTrip(id) {
      const [rows] = await db.query<ReservationTripRow[]>(`${SELECT_WITH_TRIP} WHERE r.id = ?`, [
        id,
      ]);
      return rows[0] ? toReservationWithTrip(rows[0]) : null;
    },

    async listByUser(userId) {
      const [rows] = await db.query<ReservationTripRow[]>(
        `${SELECT_WITH_TRIP} WHERE r.user_id = ? ORDER BY t.departure_time, r.id`,
        [userId],
      );
      return rows.map(toReservationWithTrip);
    },

    async markCancelled(id) {
      await db.query(
        `UPDATE reservations
            SET status = 'cancelled', cancelled_at = UTC_TIMESTAMP()
          WHERE id = ?`,
        [id],
      );
    },
  };
}
