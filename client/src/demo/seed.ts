import type { Reservation, TravelMode, Trip, User } from '@server/domain/types.ts'

type Service = [
  mode: TravelMode,
  operator: string,
  code: string,
  origin: string,
  destination: string,
  departs: string,
  minutes: number,
  baseFare: number,
  capacity: number,
]

// Same daily timetable as server/db/seed.sql. Departure times are IST.
const TIMETABLE: Service[] = [
  ['flight', 'Skyline Air', 'SK 201', 'Bengaluru', 'Mumbai', '06:10', 105, 4899, 180],
  ['flight', 'Monsoon Air', 'MN 412', 'Bengaluru', 'Mumbai', '18:45', 110, 5299, 186],
  ['flight', 'Skyline Air', 'SK 202', 'Mumbai', 'Bengaluru', '09:30', 105, 4999, 180],
  ['flight', 'Skyline Air', 'SK 305', 'Bengaluru', 'New Delhi', '07:00', 165, 6899, 180],
  ['flight', 'Monsoon Air', 'MN 518', 'New Delhi', 'Bengaluru', '15:20', 170, 7199, 186],
  ['flight', 'Monsoon Air', 'MN 140', 'Bengaluru', 'Goa', '11:15', 75, 3599, 150],
  ['flight', 'Skyline Air', 'SK 118', 'Bengaluru', 'Kochi', '08:40', 70, 3299, 150],
  ['flight', 'Skyline Air', 'SK 421', 'Bengaluru', 'Hyderabad', '13:05', 75, 3199, 180],
  ['flight', 'Monsoon Air', 'MN 650', 'Bengaluru', 'Pune', '16:30', 95, 3899, 150],
  ['flight', 'Monsoon Air', 'MN 760', 'Mumbai', 'Goa', '12:40', 70, 3299, 150],
  ['train', 'Garden City Express', '16021', 'Bengaluru', 'Chennai', '06:00', 330, 795, 72],
  ['train', 'Garden City Express', '16022', 'Chennai', 'Bengaluru', '14:30', 330, 795, 72],
  ['train', 'Western Ghats Express', '16523', 'Bengaluru', 'Mysuru', '07:15', 150, 265, 90],
  ['train', 'Western Ghats Express', '16524', 'Mysuru', 'Bengaluru', '17:40', 150, 265, 90],
  ['train', 'Deccan Link', '17603', 'Bengaluru', 'Hyderabad', '20:10', 690, 1240, 72],
  ['train', 'Konkan Link', '16595', 'Bengaluru', 'Goa', '21:00', 780, 1185, 64],
  ['train', 'Arabian Link', '11301', 'Bengaluru', 'Mumbai', '20:30', 1440, 1650, 72],
  ['train', 'Capital Link', '22691', 'Bengaluru', 'New Delhi', '20:00', 2040, 3450, 64],
  ['bus', 'Greenline Travels', 'GL 7', 'Bengaluru', 'Mysuru', '08:00', 195, 449, 40],
  ['bus', 'Greenline Travels', 'GL 8', 'Mysuru', 'Bengaluru', '15:30', 195, 449, 40],
  ['bus', 'Greenline Travels', 'GL 9', 'Bengaluru', 'Chennai', '22:30', 390, 899, 36],
  ['bus', 'Greenline Travels', 'GL 21', 'Mumbai', 'Pune', '07:30', 210, 549, 40],
  ['bus', 'Nightrider Sleeper', 'NR 21', 'Bengaluru', 'Goa', '19:30', 720, 1499, 30],
  ['bus', 'Nightrider Sleeper', 'NR 33', 'Bengaluru', 'Hyderabad', '21:45', 600, 1299, 30],
  ['bus', 'Coastal Coaches', 'CC 12', 'Bengaluru', 'Kochi', '20:15', 660, 1199, 36],
  ['bus', 'Coastal Coaches', 'CC 14', 'Bengaluru', 'Pune', '18:00', 900, 1599, 36],
]

export const SERVICES_PER_DAY = TIMETABLE.length
export const DAYS_AHEAD = 14
export const SAMPLE_TRAVELLERS = ['asha@example.com', 'vikram@example.com']

const DAY_MS = 24 * 60 * 60 * 1000

export interface DemoData {
  version: 1
  // IST date of day 0; trip ids and the daily fare and load variations count from here.
  anchor: string
  users: User[]
  reservations: Reservation[]
}

let crcTable: Uint32Array | undefined

// Same checksum as MySQL's CRC32(), which seed.sql uses for its day-to-day variation.
export function crc32(text: string): number {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c
  })
  let crc = 0xffffffff
  for (const byte of new TextEncoder().encode(text)) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS)

const tripId = (day: number, code: string) => day * SERVICES_PER_DAY + TIMETABLE.findIndex((s) => s[2] === code) + 1

// Ids run day by day through the timetable, so an id always maps back to the same departure.
export function tripFor(anchor: string, id: number): Trip {
  const day = Math.floor((id - 1) / SERVICES_PER_DAY)
  const [mode, operator, code, origin, destination, departs, minutes, baseFare, capacity] =
    TIMETABLE[(id - 1) % SERVICES_PER_DAY]
  const [hours, mins] = departs.split(':').map(Number)
  const dayStart = new Date(`${anchor}T00:00:00+05:30`).getTime() + day * DAY_MS
  const departureTime = new Date(dayStart + (hours * 60 + mins) * 60_000)

  return {
    id,
    mode,
    operator,
    code,
    origin,
    destination,
    departureTime,
    arrivalTime: new Date(departureTime.getTime() + minutes * 60_000),
    price: Math.round((baseFare * (90 + (crc32(`${code}:fare:${day}`) % 25))) / 100),
    seatCapacity: capacity,
    seatsAvailable: capacity - Math.floor((capacity * (crc32(`${code}:load:${day}`) % 97)) / 100),
  }
}

// The next 14 days of departures plus any older trip a reservation points at. Seats held by
// confirmed reservations are taken off, like the UPDATE at the end of seed.sql.
export function tripsFor(data: DemoData, today: string): Trip[] {
  const first = daysBetween(data.anchor, today) * SERVICES_PER_DAY + 1
  const ids = new Set<number>()
  for (let id = first; id < first + DAYS_AHEAD * SERVICES_PER_DAY; id++) ids.add(id)

  const booked = new Map<number, number>()
  for (const reservation of data.reservations) {
    ids.add(reservation.tripId)
    if (reservation.status === 'confirmed') {
      booked.set(reservation.tripId, (booked.get(reservation.tripId) ?? 0) + reservation.seats)
    }
  }

  return [...ids].map((id) => {
    const trip = tripFor(data.anchor, id)
    trip.seatsAvailable = Math.max(0, trip.seatsAvailable - (booked.get(id) ?? 0))
    return trip
  })
}

export function seedData(today: string, now = new Date()): DemoData {
  const users: User[] = [
    { id: 1, name: 'Asha Rao', email: 'asha@example.com', phone: '+91 98450 12345', createdAt: now },
    { id: 2, name: 'Vikram Shetty', email: 'vikram@example.com', phone: null, createdAt: now },
  ]
  const bookings = [
    { userId: 1, code: 'MN 140', day: 3, seats: 2, status: 'confirmed' },
    { userId: 1, code: '16021', day: 6, seats: 1, status: 'confirmed' },
    { userId: 1, code: 'CC 12', day: 9, seats: 2, status: 'cancelled' },
    { userId: 2, code: 'SK 201', day: 2, seats: 1, status: 'confirmed' },
  ] as const

  const reservations = bookings.map(({ userId, code, day, seats, status }, index): Reservation => {
    const trip = tripFor(today, tripId(day, code))
    return {
      id: index + 1,
      userId,
      tripId: trip.id,
      seats,
      totalPrice: trip.price * seats,
      status,
      createdAt: now,
      cancelledAt: status === 'cancelled' ? now : null,
    }
  })

  return { version: 1, anchor: today, users, reservations }
}
