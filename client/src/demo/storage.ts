import { daysBetween, seedData, type DemoData } from './seed'

export const STORAGE_KEY = 'voyagr-demo'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function parse(raw: string | null): DemoData | null {
  if (!raw) return null
  const data = JSON.parse(raw) as DemoData
  if (
    data?.version !== 1 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data.anchor) ||
    !Array.isArray(data.users) ||
    !Array.isArray(data.reservations)
  ) {
    return null
  }
  return {
    ...data,
    users: data.users.map((user) => ({ ...user, createdAt: new Date(user.createdAt) })),
    reservations: data.reservations.map((reservation) => ({
      ...reservation,
      createdAt: new Date(reservation.createdAt),
      cancelledAt: reservation.cancelledAt ? new Date(reservation.cancelledAt) : null,
    })),
  }
}

export function saveData(storage: StorageLike, data: DemoData) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or blocked: the demo still works, it just won't remember.
  }
}

export function loadData(storage: StorageLike, today: string): DemoData {
  try {
    const data = parse(storage.getItem(STORAGE_KEY))
    if (data && daysBetween(data.anchor, today) >= 0) return data
  } catch {
    // Unreadable data gets replaced with a fresh seed below.
  }
  const data = seedData(today)
  saveData(storage, data)
  return data
}

let storage: StorageLike | undefined

// Private windows and strict privacy settings can block localStorage.
// Fall back to memory so the demo still works for the session.
export function browserStorage(): StorageLike {
  if (storage) return storage
  try {
    window.localStorage.setItem(`${STORAGE_KEY}-check`, '1')
    window.localStorage.removeItem(`${STORAGE_KEY}-check`)
    storage = window.localStorage
  } catch {
    const items = new Map<string, string>()
    storage = {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => void items.set(key, value),
      removeItem: (key) => void items.delete(key),
    }
  }
  return storage
}

export function resetDemoData(target: StorageLike = browserStorage()) {
  target.removeItem(STORAGE_KEY)
}
