import type { Pool } from 'mysql2/promise';
import type { Repositories, Store } from '../types.ts';
import type { Queryable } from './queryable.ts';
import { createReservationRepository } from './reservations.ts';
import { createTripRepository } from './trips.ts';
import { createUserRepository } from './users.ts';

const createRepositories = (db: Queryable): Repositories => ({
  users: createUserRepository(db),
  trips: createTripRepository(db),
  reservations: createReservationRepository(db),
});

export function createMySqlStore(pool: Pool): Store {
  return {
    ...createRepositories(pool),

    async transaction(work) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await work(createRepositories(connection));
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async ping() {
      await pool.query('SELECT 1');
    },

    close: () => pool.end(),
  };
}
