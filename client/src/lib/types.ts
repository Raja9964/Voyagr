export type TravelMode = 'flight' | 'train' | 'bus'
export type TripSort = 'departure' | 'price' | 'duration'

export interface Trip {
  id: number
  mode: TravelMode
  operator: string
  code: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  price: number
  seatCapacity: number
  seatsAvailable: number
}

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  createdAt: string
}

export interface Reservation {
  id: number
  userId: number
  tripId: number
  seats: number
  totalPrice: number
  status: 'confirmed' | 'cancelled'
  createdAt: string
  cancelledAt: string | null
  trip: Trip
}

export interface TripSearch {
  from?: string
  to?: string
  date?: string
  seats?: number
  mode?: TravelMode[]
  maxPrice?: number
  sort?: TripSort
}
