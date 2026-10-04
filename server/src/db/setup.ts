import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import type { DbConfig } from '../config.ts';

const sqlFile = (name: string) => readFile(new URL(`../../db/${name}`, import.meta.url), 'utf8');

// Recreates every table, so only point this at a database you are happy to wipe.
export async function initDatabase(config: DbConfig, { seed = true } = {}): Promise<void> {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    multipleStatements: true,
    timezone: 'Z',
  });

  try {
    const database = mysql.escapeId(config.database);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    await connection.query(`USE ${database}`);
    await connection.query(await sqlFile('schema.sql'));
    if (seed) {
      await connection.query(await sqlFile('seed.sql'));
    }
  } finally {
    await connection.end();
  }
}
