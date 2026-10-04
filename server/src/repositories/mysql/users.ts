import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { User } from '../../domain/types.ts';
import { ConflictError } from '../../errors.ts';
import type { UserRepository } from '../types.ts';
import type { Queryable } from './queryable.ts';

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  created_at: Date;
}

const USER_COLUMNS = 'id, name, email, phone, created_at';

const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  createdAt: row.created_at,
});

const isDuplicateKey = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';

export function createUserRepository(db: Queryable): UserRepository {
  async function findOne(column: 'id' | 'email', value: number | string): Promise<User | null> {
    const [rows] = await db.query<UserRow[]>(
      `SELECT ${USER_COLUMNS} FROM users WHERE ${column} = ?`,
      [value],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  return {
    async create({ name, email, phone }) {
      let insertId: number;
      try {
        const [result] = await db.query<ResultSetHeader>(
          'INSERT INTO users (name, email, phone) VALUES (?, ?, ?)',
          [name, email, phone],
        );
        insertId = result.insertId;
      } catch (error) {
        // The unique key is the real guard against two sign-ups racing on one email.
        if (isDuplicateKey(error)) {
          throw new ConflictError('An account with this email already exists');
        }
        throw error;
      }

      const user = await findOne('id', insertId);
      if (!user) throw new Error(`User ${insertId} missing after insert`);
      return user;
    },

    findById: (id) => findOne('id', id),

    findByEmail: (email) => findOne('email', email),
  };
}
