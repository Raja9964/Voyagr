import { beforeEach, describe, expect, it } from 'vitest'
import { todayInIndia } from '../lib/format'
import { createDemoServer } from './backend'
import { DAYS_AHEAD, SERVICES_PER_DAY, crc32, seedData, tripFor, tripsFor, type DemoData } from './seed'
import { STORAGE_KEY, resetDemoData, type StorageLike } from './storage'

function memoryStorage(): StorageLike {
  const items = new Map<string, string>()
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }
}

let storage: StorageLike
let server: ReturnType<typeof createDemoServer>

async function call(path: string, init?: RequestInit) {
  const response = await server.request(path, init)
  return { status: response.status, body: await response.json() }
}

const post = (path: string, body?: object) =>
  call(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

beforeEach(() => {
  storage = memoryStorage()
  server = createDemoServer(storage)
})

describe('seed', () => {
  it('uses the same checksum as MySQL CRC32()', () => {
    expect(crc32('MySQL')).toBe(3259397556)
    expect(crc32('SK 201:fare:0')).toBe(2378139535)
  })

  it('produces the fares and seat loads MySQL gives for seed.sql', () => {
    const anchor = '2026-10-04'
    const pick = (id: number) => {
      const { code, price, seatsAvailable } = tripFor(anchor, id)
      return [code, price, seatsAvailable]
    }
    expect(pick(1)).toEqual(['SK 201', 4899, 71])
    expect(pick(11)).toEqual(['16021', 763, 34])
    expect(pick(1 * SERVICES_PER_DAY + 23)).toEqual(['NR 21', 1709, 19])
    expect(pick(8 * SERVICES_PER_DAY + 21)).toEqual(['GL 9', 863, 3])
    expect(pick(13 * SERVICES_PER_DAY + 18)).toEqual(['22691', 3416, 56])
    expect(tripFor(anchor, 1).departureTime.toISOString()).toBe('2026-10-04T00:40:00.000Z')
  })

  it('lays out 26 daily services over 14 days from today', () => {
    const today = todayInIndia()
    const trips = tripsFor(seedData(today), today)
    expect(trips).toHaveLength(SERVICES_PER_DAY * DAYS_AHEAD)
    const last = trips.at(-1)!
    expect(last.departureTime.getTime() - Date.parse(`${today}T00:00:00+05:30`)).toBeLessThan(DAYS_AHEAD * 86_400_000)
  })

  it('keeps old trips that reservations point at when the window moves on', () => {
    const data: DemoData = seedData('2026-01-01')
    const trips = tripsFor(data, '2026-02-01')
    expect(trips.length).toBeGreaterThan(SERVICES_PER_DAY * DAYS_AHEAD)
    for (const reservation of data.reservations) expect(trips.some((t) => t.id === reservation.tripId)).toBe(true)
  })
})

describe('demo API', () => {
  it('searches upcoming trips only, with the same filters as the server', async () => {
    const all = await call('/trips?limit=100')
    expect(all.status).toBe(200)
    expect(all.body).toHaveLength(100)
    expect(all.body.every((t: { departureTime: string }) => Date.parse(t.departureTime) > Date.now())).toBe(true)

    const goa = await call('/trips?from=bengaluru&to=Goa&mode=flight,bus&sort=price')
    expect(goa.body.length).toBeGreaterThan(0)
    expect(goa.body.every((t: { mode: string; destination: string }) => t.mode !== 'train' && t.destination === 'Goa')).toBe(true)
    const prices = goa.body.map((t: { price: number }) => t.price)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('lists the seeded cities', async () => {
    const { body } = await call('/cities')
    expect(body).toEqual(['Bengaluru', 'Chennai', 'Goa', 'Hyderabad', 'Kochi', 'Mumbai', 'Mysuru', 'New Delhi', 'Pune'])
  })

  it('returns validation errors in the server format', async () => {
    const search = await call('/trips?mode=boat&date=2026-13-40')
    expect(search.status).toBe(400)
    expect(search.body.error.code).toBe('validation_error')
    expect(search.body.error.details.map((d: { path: string }) => d.path)).toEqual(expect.arrayContaining(['mode.0', 'date']))

    const user = await post('/users', { name: 'A', email: 'not-an-email' })
    expect(user.status).toBe(400)
    expect(user.body.error.details).toHaveLength(2)

    expect((await call('/trips/abc')).status).toBe(400)
    expect((await call('/reservations', { method: 'POST', body: '{"userId":' })).body.error.message).toBe(
      'Malformed JSON body',
    )
    expect((await call('/nope')).body.error).toEqual({ code: 'not_found', message: 'Route GET /api/nope not found' })
  })

  it('registers travellers and rejects duplicate emails', async () => {
    const created = await post('/users', { name: 'Ravi Kumar', email: '  Ravi@Example.com ' })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ id: 3, email: 'ravi@example.com', phone: null })
    expect((await post('/users', { name: 'Asha', email: 'ASHA@example.com' })).status).toBe(409)
    expect((await call('/users/lookup?email=ravi%40example.com')).body.id).toBe(3)
  })

  it('books seats, saves the booking and cancels it once', async () => {
    const [trip] = (await call('/trips?from=Bengaluru&to=Mumbai&seats=2')).body
    const booked = await post('/reservations', { userId: 1, tripId: trip.id, seats: 2 })
    expect(booked.status).toBe(201)
    expect(booked.body).toMatchObject({ seats: 2, totalPrice: trip.price * 2, status: 'confirmed' })
    expect(booked.body.trip.seatsAvailable).toBe(trip.seatsAvailable - 2)

    // A new server on the same storage is what a page reload looks like.
    server = createDemoServer(storage)
    const mine = await call('/users/1/reservations')
    expect(mine.body.map((r: { id: number }) => r.id)).toContain(booked.body.id)
    expect((await call(`/trips/${trip.id}`)).body.seatsAvailable).toBe(trip.seatsAvailable - 2)

    const cancelled = await post(`/reservations/${booked.body.id}/cancel`)
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.status).toBe('cancelled')
    expect((await call(`/trips/${trip.id}`)).body.seatsAvailable).toBe(trip.seatsAvailable)
    expect((await post(`/reservations/${booked.body.id}/cancel`)).status).toBe(409)
    expect((await post('/reservations/999/cancel')).status).toBe(404)
  })

  it('refuses to overbook', async () => {
    const [trip] = (await call('/trips?from=Bengaluru&to=Mysuru&mode=bus')).body
    const seats = Math.min(trip.seatsAvailable, 9)
    for (let left = trip.seatsAvailable; left > 0; left -= seats) {
      await post('/reservations', { userId: 2, tripId: trip.id, seats: Math.min(seats, left) })
    }
    const refused = await post('/reservations', { userId: 2, tripId: trip.id, seats: 1 })
    expect(refused.status).toBe(409)
    expect(refused.body.error.message).toBe('This trip is sold out')
  })

  it('only books and cancels before departure', async () => {
    const data = seedData('2026-01-01')
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
    const departed = data.reservations.find((r) => r.status === 'confirmed')!

    const cancel = await post(`/reservations/${departed.id}/cancel`)
    expect(cancel.status).toBe(409)
    expect(cancel.body.error.message).toBe('Reservations can only be cancelled before departure')

    const book = await post('/reservations', { userId: 1, tripId: departed.tripId, seats: 1 })
    expect(book.status).toBe(409)
    expect(book.body.error.message).toBe('This trip has already departed')
  })

  it('starts again from the sample data after a reset', async () => {
    await post('/users', { name: 'Ravi Kumar', email: 'ravi@example.com' })
    resetDemoData(storage)
    expect((await call('/users/lookup?email=ravi@example.com')).status).toBe(404)
    expect((await call('/users/1/reservations')).body).toHaveLength(3)
  })
})
