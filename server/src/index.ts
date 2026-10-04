import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createPool } from './db/pool.ts';
import { createMySqlStore } from './repositories/mysql/store.ts';

const config = loadConfig();
const store = createMySqlStore(createPool(config.db));
const app = createApp({ store, corsOrigins: config.corsOrigins });

const server = app.listen(config.port, () => {
  console.log(`Voyagr API listening on http://localhost:${config.port}`);
});

server.on('error', (error) => {
  console.error('Server failed to start:', error.message);
  process.exit(1);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    store.close().finally(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
