import type {
  NewReservation,
  NewUser,
  Reservation,
  ReservationWithTrip,
  Trip,
  TripQuery,
  User,
} from '../domain/types.ts';

// `lock` only has an effect inside Store.transaction (SELECT ... FOR UPDATE).
export interface FindOptions {
  lock?: boolean;
}

export interface UserRepository {
  create(user: NewUser): Promise<User>;
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

export interface TripRepository {
  search(query: TripQuery): Promise<Trip[]>;
  findById(id: number, options?: FindOptions): Promise<Trip | null>;
  adjustSeats(id: number, delta: number): Promise<void>;
  listCities(): Promise<string[]>;
}

export interface ReservationRepository {
  create(reservation: NewReservation): Promise<number>;
  findById(id: number, options?: FindOptions): Promise<Reservation | null>;
  findWithTrip(id: number): Promise<ReservationWithTrip | null>;
  listByUser(userId: number): Promise<ReservationWithTrip[]>;
  markCancelled(id: number): Promise<void>;
}

export interface Repositories {
  users: UserRepository;
  trips: TripRepository;
  reservations: ReservationRepository;
}

export interface Store extends Repositories {
  transaction<T>(work: (tx: Repositories) => Promise<T>): Promise<T>;
  ping(): Promise<void>;
  close(): Promise<void>;
}
