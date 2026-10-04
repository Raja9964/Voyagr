import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Store } from './repositories/types.ts';
import { createServices } from './services/index.ts';
import { errorHandler, notFoundHandler } from './http/error-handler.ts';
import { reservationRoutes } from './http/routes/reservations.ts';
import { cityRoutes, tripRoutes } from './http/routes/trips.ts';
import { userRoutes } from './http/routes/users.ts';

export interface AppOptions {
  store: Store;
  corsOrigins: string[];
}

export function createApp({ store, corsOrigins }: AppOptions): Express {
  const services = createServices(store);
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: '10kb' }));

  const api = express.Router();

  api.get('/health', async (_req, res) => {
    try {
      await store.ping();
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });

  api.use('/cities', cityRoutes(services));
  api.use('/trips', tripRoutes(services));
  api.use('/users', userRoutes(services));
  api.use('/reservations', reservationRoutes(services));

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
