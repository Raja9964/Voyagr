import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import { createMemoryStore } from '../src/repositories/memory/store.ts';
import type { Store } from '../src/repositories/types.ts';
import { asha, hoursFromNow, makeTrip } from './fixtures.ts';

let store: Store;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  store = createMemoryStore({
    users: [asha],
    trips: [
      makeTrip({ id: 1, price: 5200, seatsAvailable: 3, departureTime: hoursFromNow(30) }),
      makeTrip({ id: 2, mode: 'train', operator: 'Garden City Express', price: 800, departureTime: hoursFromNow(20) }),
      makeTrip({ id: 3, mode: 'bus', origin: 'Bengaluru', destination: 'Mysuru', price: 450 }),
      makeTrip({ id: 4, departureTime: hoursFromNow(-2) }),
    ],
  });
  app = createApp({ store, corsOrigins: ['http://localhost:5102'] });
});

describe('GET /api/health', () => {
  it('reports ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('trips', () => {
  it('lists upcoming trips in departure order and hides departed ones', async () => {
    const res = await request(app).get('/api/trips');
    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: number }) => t.id)).toEqual([2, 1, 3]);
  });

  it('filters by route, mode and price', async () => {
    const res = await request(app)
      .get('/api/trips')
      .query({ from: 'bengaluru', to: 'Mumbai', mode: 'flight,train', maxPrice: 1000 });
    expect(res.status).toBe(200);
    expect(res.body.map((t: { id: number }) => t.id)).toEqual([2]);
  });

  it('excludes trips without enough seats and sorts by price', async () => {
    const res = await request(app).get('/api/trips').query({ seats: 4, sort: 'price' });
    expect(res.body.map((t: { id: number }) => t.id)).toEqual([3, 2]);
  });

  it('rejects unknown filter values', async () => {
    const res = await request(app).get('/api/trips').query({ mode: 'boat', date: '2026-13-40' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_error');
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['mode.0', 'date']),
    );
  });

  it('returns a trip by id or 404', async () => {
    expect((await request(app).get('/api/trips/1')).body.code).toBe('SK 1');
    expect((await request(app).get('/api/trips/99')).status).toBe(404);
    expect((await request(app).get('/api/trips/abc')).status).toBe(400);
  });

  it('lists distinct cities', async () => {
    const res = await request(app).get('/api/cities');
    expect(res.body).toEqual(['Bengaluru', 'Mumbai', 'Mysuru']);
  });
});

describe('users', () => {
  it('registers a traveller and returns the new id', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Ravi Kumar', email: '  Ravi@Example.com ', phone: '+91 99000 11223' });
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/users/${res.body.id}`);
    expect(res.body).toMatchObject({ id: 2, name: 'Ravi Kumar', email: 'ravi@example.com' });
  });

  it('rejects a duplicate email with 409', async () => {
    const res = await request(app).post('/api/users').send({ name: 'Asha', email: 'ASHA@example.com' });
    expect(res.status).toBe(409);
  });

  it('validates the payload', async () => {
    const res = await request(app).post('/api/users').send({ name: 'A', email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveLength(2);
  });

  it('looks a traveller up by email', async () => {
    expect((await request(app).get('/api/users/lookup?email=asha@example.com')).body.id).toBe(1);
    expect((await request(app).get('/api/users/lookup?email=nobody@example.com')).status).toBe(404);
  });
});

describe('reservations', () => {
  const book = (body: object) => request(app).post('/api/reservations').send(body);

  it('books seats, snapshots the fare and decrements availability', async () => {
    const res = await book({ userId: 1, tripId: 1, seats: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ userId: 1, tripId: 1, seats: 2, totalPrice: 10400, status: 'confirmed' });
    expect(res.body.trip.seatsAvailable).toBe(1);
  });

  it('refuses to overbook', async () => {
    const res = await book({ userId: 1, tripId: 1, seats: 4 });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Only 3 seats left on this trip');
    expect((await store.trips.findById(1))?.seatsAvailable).toBe(3);
  });

  it('never sells more seats than exist under concurrent requests', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () => book({ userId: 1, tripId: 1, seats: 1 })),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 201, 201, 409, 409, 409]);
    expect((await store.trips.findById(1))?.seatsAvailable).toBe(0);
  });

  it('returns 404 for an unknown user or trip and 409 for a departed trip', async () => {
    expect((await book({ userId: 9, tripId: 1, seats: 1 })).status).toBe(404);
    expect((await book({ userId: 1, tripId: 99, seats: 1 })).status).toBe(404);
    expect((await book({ userId: 1, tripId: 4, seats: 1 })).status).toBe(409);
  });

  it('validates the booking payload and malformed JSON', async () => {
    expect((await book({ userId: 1, tripId: 1, seats: 0 })).status).toBe(400);
    const res = await request(app)
      .post('/api/reservations')
      .set('Content-Type', 'application/json')
      .send('{"userId":');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Malformed JSON body');
  });

  it("lists a traveller's reservations", async () => {
    await book({ userId: 1, tripId: 1, seats: 1 });
    await book({ userId: 1, tripId: 2, seats: 2 });
    const res = await request(app).get('/api/users/1/reservations');
    expect(res.status).toBe(200);
    expect(res.body.map((r: { tripId: number }) => r.tripId)).toEqual([2, 1]);
    expect((await request(app).get('/api/users/42/reservations')).status).toBe(404);
  });

  it('cancels once, restores seats, and 404s for unknown ids', async () => {
    const { body: booking } = await book({ userId: 1, tripId: 1, seats: 2 });

    const cancelled = await request(app).post(`/api/reservations/${booking.id}/cancel`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('cancelled');
    expect(cancelled.body.cancelledAt).toBeTruthy();
    expect(cancelled.body.trip.seatsAvailable).toBe(3);

    expect((await request(app).post(`/api/reservations/${booking.id}/cancel`)).status).toBe(409);
    expect((await request(app).post('/api/reservations/999/cancel')).status).toBe(404);
  });

  it('returns 404 JSON for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
  });
});
