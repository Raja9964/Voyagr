import type { Pool, PoolConnection } from 'mysql2/promise';

// Repositories run against the pool, or against a single connection inside a transaction.
export type Queryable = Pool | PoolConnection;
