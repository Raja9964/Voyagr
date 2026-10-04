import type { Pool, RowDataPacket } from 'mysql2/promise';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { createPool } from '../src/db/pool.ts';
import { initDatabase } from '../src/db/setup.ts';
import { createMySqlStore } from '../src/repositories/mysql/store.ts';

// Runs only when a MySQL server is configured, e.g. DB_HOST=127.0.0.1 npm test.
// Uses its own database (TEST_DB_NAME, default voyagr_test) because it wipes every table.
const enabled = Boolean(process.env.DB_HOST);

describe.skipIf(!enabled)('MySQL integration', () => {
  const config = loadConfig();
  const db = { ...config.db, database: process.env.TEST_DB_NAME ?? 'voyagr_test' };
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  const seatsLeft = async (tripId: number) => {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT seats_available FROM trips WHERE id = ?', [tripId]);
    return rows[0]?.seats_available as number;
  };

  beforeAll(async () => {
    await initDatabase(db, { seed: false });
    pool = createPool(db);
    app = createApp({ store: createMySqlStore(pool), corsOrigins: [] });
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM reservations');
    await pool.query('DELETE FROM trips');
    await pool.query('DELETE FROM users');
    await pool.query(
      `INSERT INTO users (id, name, email) VALUES (1, 'Asha Rao', 'asha@example.com')`,
    );
    await pool.query(
      `INSERT INTO trips (id, mode, operator, code, origin, destination, departure_time, arrival_time,
                          price, seat_capacity, seats_available)
       VALUES
         (1, 'flight', 'Skyline Air', 'SK 201', 'Bengaluru', 'Mumbai',
          UTC_TIMESTAMP() + INTERVAL 1 DAY, UTC_TIMESTAMP() + INTERVAL 26 HOUR, 4899.50, 180, 5),
         (2, 'train', 'Garden City Express', '16021', 'Bengaluru', 'Chennai',
          UTC_TIMESTAMP() + INTERVAL 2 DAY, UTC_TIMESTAMP() + INTERVAL 53 HOUR, 795, 72, 40),
         (3, 'bus', 'Greenline Travels', 'GL 7', 'Bengaluru', 'Mysuru',
          UTC_TIMESTAMP() - INTERVAL 1 HOUR, UTC_TIMESTAMP() + INTERVAL 2 HOUR, 449, 40, 40)`,
    );
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('searches with filters in SQL', async () => {
    const res = await request(app).get('/api/trips').query({ from: 'bengaluru', mode: 'flight,train', sort: 'price' });
    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: number }) => t.id)).toEqual([2, 1]);
    expect(res.body[1]).toMatchObject({ price: 4899.5, seatsAvailable: 5 });
    expect(new Date(res.body[1].departureTime).getTime()).toBeGreaterThan(Date.now());
  });

  it('maps a duplicate email to 409 via the unique key', async () => {
    const res = await request(app).post('/api/users').send({ name: 'Asha', email: 'asha@example.com' });
    expect(res.status).toBe(409);
  });

  it('does not overbook when many requests race for the last seats', async () => {
    const attempts = 12;
    const results = await Promise.all(
      Array.from({ length: attempts }, () =>
        request(app).post('/api/reservations').send({ userId: 1, tripId: 1, seats: 1 }),
      ),
    );

    const created = results.filter((r) => r.status === 201);
    expect(created).toHaveLength(5);
    expect(results.filter((r) => r.status === 409)).toHaveLength(attempts - 5);
    expect(await seatsLeft(1)).toBe(0);

    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(seats), 0) AS booked FROM reservations WHERE trip_id = 1 AND status = 'confirmed'",
    );
    expect(Number(rows[0]?.booked)).toBe(5);
  });

  it('cancels a reservation and restores the seats', async () => {
    const { body: booking } = await request(app)
      .post('/api/reservations')
      .send({ userId: 1, tripId: 2, seats: 3 });
    expect(booking.totalPrice).toBe(2385);
    expect(await seatsLeft(2)).toBe(37);

    const res = await request(app).post(`/api/reservations/${booking.id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(await seatsLeft(2)).toBe(40);

    const list = await request(app).get('/api/users/1/reservations');
    expect(list.body).toHaveLength(1);
    expect(list.body[0].trip.code).toBe('16021');
  });

  it('rolls back when the booking fails part-way', async () => {
    const res = await request(app).post('/api/reservations').send({ userId: 1, tripId: 3, seats: 1 });
    expect(res.status).toBe(409);
    expect(await seatsLeft(3)).toBe(40);
  });

  it('enforces seat limits in the schema itself', async () => {
    await expect(pool.query('UPDATE trips SET seats_available = seats_available - 6 WHERE id = 1')).rejects.toThrow();
    await expect(pool.query('UPDATE trips SET seats_available = 999 WHERE id = 1')).rejects.toThrow();
  });
});
