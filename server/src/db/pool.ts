import mysql, { type Pool, type PoolOptions } from 'mysql2/promise';
import type { DbConfig } from '../config.ts';

export function createPool(config: DbConfig, overrides: PoolOptions = {}): Pool {
  return mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: config.poolSize,
    waitForConnections: true,
    enableKeepAlive: true,
    // DATETIME columns hold UTC; DECIMAL comes back as number instead of string.
    timezone: 'Z',
    decimalNumbers: true,
    ...overrides,
  });
}
