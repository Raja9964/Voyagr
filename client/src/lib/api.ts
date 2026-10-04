import type { Reservation, Trip, TripSearch, User } from './types'

const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly details: { path: string; message: string }[]

  constructor(status: number, message: string, details: { path: string; message: string }[] = []) {
    super(message)
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.details?.[0]?.message ?? body?.error?.message ?? `Request failed (${response.status})`,
      body?.error?.details,
    )
  }
  return body as T
}

export function toQueryString(params: Record<string, string | number | string[] | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','))
    } else {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const api = {
  cities: () => request<string[]>('/cities'),
  searchTrips: (search: TripSearch) => request<Trip[]>(`/trips${toQueryString({ ...search })}`),
  getTrip: (id: number) => request<Trip>(`/trips/${id}`),
  lookupUser: (email: string) => request<User>(`/users/lookup${toQueryString({ email })}`),
  registerUser: (input: { name: string; email: string; phone?: string }) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(input) }),
  listReservations: (userId: number) => request<Reservation[]>(`/users/${userId}/reservations`),
  getReservation: (id: number) => request<Reservation>(`/reservations/${id}`),
  book: (input: { userId: number; tripId: number; seats: number }) =>
    request<Reservation>('/reservations', { method: 'POST', body: JSON.stringify(input) }),
  cancel: (id: number) => request<Reservation>(`/reservations/${id}/cancel`, { method: 'POST' }),
}
