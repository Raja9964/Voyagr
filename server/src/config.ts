import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8102),
  CLIENT_ORIGIN: z.string().default('http://localhost:5102'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default('voyagr'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('voyagr'),
  DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
});

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  poolSize: number;
}

export interface Config {
  port: number;
  corsOrigins: string[];
  db: DbConfig;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }
  const e = parsed.data;
  return {
    port: e.PORT,
    corsOrigins: e.CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
    db: {
      host: e.DB_HOST,
      port: e.DB_PORT,
      user: e.DB_USER,
      password: e.DB_PASSWORD,
      database: e.DB_NAME,
      poolSize: e.DB_POOL_SIZE,
    },
  };
}
