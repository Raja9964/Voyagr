import { ZodError } from 'zod'
import type { Reservation, ReservationWithTrip } from '@server/domain/types.ts'
import { AppError } from '@server/errors.ts'
import {
  createReservationSchema,
  idSchema,
  registerUserSchema,
  tripSearchSchema,
  userLookupSchema,
} from '@server/http/schemas.ts'
import { createMemoryStore } from '@server/repositories/memory/store.ts'
import { createServices, type Services } from '@server/services/index.ts'
import { todayInIndia } from '../lib/format'
import { tripsFor, type DemoData } from './seed'
import { browserStorage, loadData, saveData, type StorageLike } from './storage'

type Query = Record<string, string | string[]>

interface RouteContext {
  services: Services
  data: DemoData
  params: string[]
  query: Query
  body: unknown
}

type Result = [status: number, body: unknown]

class MalformedJsonError extends Error {}

const withoutTrip = ({ trip: _trip, ...reservation }: ReservationWithTrip): Reservation => reservation

// Mirrors the Express routers in server/src/http/routes.
const ROUTES: [method: string, path: RegExp, handle: (ctx: RouteContext) => Promise<Result>][] = [
  ['GET', /^\/health$/i, async () => [200, { status: 'ok' }]],
  ['GET', /^\/cities$/i, async ({ services }) => [200, await services.trips.listCities()]],
  [
    'GET',
    /^\/trips$/i,
    async ({ services, query }) => {
      const { mode, ...filters } = tripSearchSchema.parse(query)
      return [200, await services.trips.search({ ...filters, modes: mode })]
    },
  ],
  [
    'GET',
    /^\/trips\/([^/]+)$/i,
    async ({ services, params }) => [200, await services.trips.getById(idSchema.parse(params[0]))],
  ],
  [
    'POST',
    /^\/users$/i,
    async ({ services, body, data }) => {
      const user = await services.users.register(registerUserSchema.parse(body))
      data.users.push(user)
      return [201, user]
    },
  ],
  [
    'GET',
    /^\/users\/lookup$/i,
    async ({ services, query }) => [200, await services.users.findByEmail(userLookupSchema.parse(query).email)],
  ],
  [
    'GET',
    /^\/users\/([^/]+)\/reservations$/i,
    async ({ services, params }) => [200, await services.reservations.listForUser(idSchema.parse(params[0]))],
  ],
  [
    'POST',
    /^\/reservations$/i,
    async ({ services, body, data }) => {
      const reservation = await services.reservations.book(createReservationSchema.parse(body))
      data.reservations.push(withoutTrip(reservation))
      return [201, reservation]
    },
  ],
  [
    'GET',
    /^\/reservations\/([^/]+)$/i,
    async ({ services, params }) => [200, await services.reservations.get(idSchema.parse(params[0]))],
  ],
  [
    'POST',
    /^\/reservations\/([^/]+)\/cancel$/i,
    async ({ services, params, data }) => {
      const reservation = await services.reservations.cancel(idSchema.parse(params[0]))
      data.reservations = data.reservations.map((r) => (r.id === reservation.id ? withoutTrip(reservation) : r))
      return [200, reservation]
    },
  ],
]

// Express's default query parser turns repeated keys into arrays.
function parseQuery(search: string): Query {
  const query: Query = {}
  for (const [key, value] of new URLSearchParams(search)) {
    const existing = query[key]
    query[key] = existing === undefined ? value : [...[existing].flat(), value]
  }
  return query
}

// express.json() only accepts objects and arrays.
function parseBody(body: RequestInit['body']): unknown {
  if (typeof body !== 'string' || body === '') return undefined
  try {
    const value: unknown = JSON.parse(body)
    if (typeof value === 'object' && value !== null) return value
  } catch {
    // reported below
  }
  throw new MalformedJsonError()
}

// Same responses as server/src/http/error-handler.ts.
function errorResult(error: unknown): Result {
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    return [400, { error: { code: 'validation_error', message: 'Request validation failed', details } }]
  }
  if (error instanceof AppError) return [error.status, { error: { code: error.code, message: error.message } }]
  if (error instanceof MalformedJsonError) return [400, { error: { code: 'bad_request', message: 'Malformed JSON body' } }]
  console.error(error)
  return [500, { error: { code: 'internal_error', message: 'Something went wrong' } }]
}

// Answers the client's /api requests in the browser. Every request rebuilds the in-memory
// store from saved data, so reloads and other tabs always see the latest bookings.
export function createDemoServer(storage: StorageLike) {
  async function handle(path: string, init: RequestInit): Promise<Response> {
    const method = (init.method ?? 'GET').toUpperCase()
    const queryStart = path.includes('?') ? path.indexOf('?') : path.length
    const pathname = path.slice(0, queryStart)
    const search = path.slice(queryStart)
    let result: Result

    try {
      const body = parseBody(init.body)
      const today = todayInIndia()
      const data = loadData(storage, today)
      const store = createMemoryStore({ users: data.users, trips: tripsFor(data, today), reservations: data.reservations })
      const services = createServices(store)

      result = [404, { error: { code: 'not_found', message: `Route ${method} /api${pathname} not found` } }]
      for (const [routeMethod, pattern, handleRoute] of ROUTES) {
        const match = routeMethod === method && pattern.exec(pathname)
        if (!match) continue
        const params = match.slice(1).map(decodeURIComponent)
        result = await handleRoute({ services, data, params, query: parseQuery(search), body })
        if (method === 'POST') saveData(storage, data)
        break
      }
    } catch (error) {
      result = errorResult(error)
    }

    const [status, payload] = result
    return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } })
  }

  let queue: Promise<unknown> = Promise.resolve()

  return {
    // One request at a time, like a single database connection.
    request(path: string, init: RequestInit = {}): Promise<Response> {
      const response = queue.then(() => handle(path, init))
      queue = response.catch(() => undefined)
      return response
    },
  }
}

let server: ReturnType<typeof createDemoServer> | undefined

export function demoFetch(path: string, init?: RequestInit): Promise<Response> {
  server ??= createDemoServer(browserStorage())
  return server.request(path, init)
}
