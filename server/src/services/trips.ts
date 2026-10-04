import type { TravelMode, Trip, TripSort } from '../domain/types.ts';
import { NotFoundError } from '../errors.ts';
import type { Store } from '../repositories/types.ts';

// Every route is domestic, so a calendar date in a search means a day in IST.
const SERVICE_UTC_OFFSET = '+05:30';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface TripSearch {
  from?: string;
  to?: string;
  date?: string;
  modes?: TravelMode[];
  maxPrice?: number;
  seats?: number;
  sort: TripSort;
  limit: number;
}

export function createTripService(store: Store) {
  return {
    search(filters: TripSearch, now = new Date()): Promise<Trip[]> {
      let departAfter = now;
      let departBefore: Date | undefined;

      if (filters.date) {
        const dayStart = new Date(`${filters.date}T00:00:00${SERVICE_UTC_OFFSET}`);
        departAfter = dayStart > now ? dayStart : now;
        departBefore = new Date(dayStart.getTime() + DAY_MS);
      }

      return store.trips.search({
        origin: filters.from,
        destination: filters.to,
        modes: filters.modes,
        maxPrice: filters.maxPrice,
        minSeats: filters.seats,
        departAfter,
        departBefore,
        sort: filters.sort,
        limit: filters.limit,
      });
    },

    async getById(id: number): Promise<Trip> {
      const trip = await store.trips.findById(id);
      if (!trip) throw new NotFoundError(`Trip ${id} not found`);
      return trip;
    },

    listCities(): Promise<string[]> {
      return store.trips.listCities();
    },
  };
}

export type TripService = ReturnType<typeof createTripService>;
