export const TRAVEL_MODES = ['flight', 'train', 'bus'] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export const TRIP_SORTS = ['departure', 'price', 'duration'] as const;
export type TripSort = (typeof TRIP_SORTS)[number];

export type ReservationStatus = 'confirmed' | 'cancelled';

export const MAX_SEATS_PER_BOOKING = 9;

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
}

export interface NewUser {
  name: string;
  email: string;
  phone: string | null;
}

export interface Trip {
  id: number;
  mode: TravelMode;
  operator: string;
  code: string;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  price: number;
  seatCapacity: number;
  seatsAvailable: number;
}

export interface TripQuery {
  origin?: string;
  destination?: string;
  modes?: TravelMode[];
  departAfter: Date;
  departBefore?: Date;
  maxPrice?: number;
  minSeats?: number;
  sort: TripSort;
  limit: number;
}

export interface Reservation {
  id: number;
  userId: number;
  tripId: number;
  seats: number;
  totalPrice: number;
  status: ReservationStatus;
  createdAt: Date;
  cancelledAt: Date | null;
}

export interface NewReservation {
  userId: number;
  tripId: number;
  seats: number;
  totalPrice: number;
}

export interface ReservationWithTrip extends Reservation {
  trip: Trip;
}
