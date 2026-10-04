import type { RowDataPacket } from 'mysql2/promise';
import type { TravelMode, Trip, TripSort } from '../../domain/types.ts';
import type { TripRepository } from '../types.ts';
import type { Queryable } from './queryable.ts';

export interface TripRow extends RowDataPacket {
  id: number;
  mode: TravelMode;
  operator: string;
  code: string;
  origin: string;
  destination: string;
  departure_time: Date;
  arrival_time: Date;
  price: number;
  seat_capacity: number;
  seats_available: number;
}

export const TRIP_COLUMNS = [
  't.id',
  't.mode',
  't.operator',
  't.code',
  't.origin',
  't.destination',
  't.departure_time',
  't.arrival_time',
  't.price',
  't.seat_capacity',
  't.seats_available',
].join(', ');

export const toTrip = (row: TripRow): Trip => ({
  id: row.id,
  mode: row.mode,
  operator: row.operator,
  code: row.code,
  origin: row.origin,
  destination: row.destination,
  departureTime: row.departure_time,
  arrivalTime: row.arrival_time,
  price: row.price,
  seatCapacity: row.seat_capacity,
  seatsAvailable: row.seats_available,
});

// ORDER BY can't be parameterised, so sort keys map to fixed SQL fragments.
const ORDER_BY: Record<TripSort, string> = {
  departure: 't.departure_time, t.id',
  price: 't.price, t.departure_time, t.id',
  duration: 'TIMESTAMPDIFF(MINUTE, t.departure_time, t.arrival_time), t.departure_time, t.id',
};

export function createTripRepository(db: Queryable): TripRepository {
  return {
    async search(query) {
      const conditions = ['t.departure_time >= ?'];
      const params: unknown[] = [query.departAfter];

      if (query.departBefore) {
        conditions.push('t.departure_time < ?');
        params.push(query.departBefore);
      }
      if (query.origin) {
        conditions.push('t.origin = ?');
        params.push(query.origin);
      }
      if (query.destination) {
        conditions.push('t.destination = ?');
        params.push(query.destination);
      }
      if (query.modes?.length) {
        conditions.push(`t.mode IN (${query.modes.map(() => '?').join(', ')})`);
        params.push(...query.modes);
      }
      if (query.maxPrice !== undefined) {
        conditions.push('t.price <= ?');
        params.push(query.maxPrice);
      }
      if (query.minSeats !== undefined) {
        conditions.push('t.seats_available >= ?');
        params.push(query.minSeats);
      }

      const [rows] = await db.query<TripRow[]>(
        `SELECT ${TRIP_COLUMNS}
           FROM trips t
          WHERE ${conditions.join(' AND ')}
          ORDER BY ${ORDER_BY[query.sort]}
          LIMIT ?`,
        [...params, query.limit],
      );
      return rows.map(toTrip);
    },

    async findById(id, { lock = false } = {}) {
      const [rows] = await db.query<TripRow[]>(
        `SELECT ${TRIP_COLUMNS} FROM trips t WHERE t.id = ?${lock ? ' FOR UPDATE' : ''}`,
        [id],
      );
      return rows[0] ? toTrip(rows[0]) : null;
    },

    async adjustSeats(id, delta) {
      await db.query('UPDATE trips SET seats_available = seats_available + ? WHERE id = ?', [
        delta,
        id,
      ]);
    },

    async listCities() {
      const [rows] = await db.query<(RowDataPacket & { city: string })[]>(
        'SELECT origin AS city FROM trips UNION SELECT destination FROM trips ORDER BY city',
      );
      return rows.map((row) => row.city);
    },
  };
}
