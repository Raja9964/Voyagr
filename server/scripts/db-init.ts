import { loadConfig } from '../src/config.ts';
import { initDatabase } from '../src/db/setup.ts';

const { db } = loadConfig();
const skipSeed = process.argv.includes('--no-seed');

try {
  await initDatabase(db, { seed: !skipSeed });
  console.log(`Database "${db.database}" on ${db.host}:${db.port} is ready${skipSeed ? '' : ' with seed data'}.`);
} catch (error) {
  console.error('Database initialisation failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
