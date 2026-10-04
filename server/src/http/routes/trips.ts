import { Router } from 'express';
import type { Services } from '../../services/index.ts';
import { idSchema, tripSearchSchema } from '../schemas.ts';

export function tripRoutes({ trips }: Services): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { mode, ...filters } = tripSearchSchema.parse(req.query);
    res.json(await trips.search({ ...filters, modes: mode }));
  });

  router.get('/:id', async (req, res) => {
    res.json(await trips.getById(idSchema.parse(req.params.id)));
  });

  return router;
}

export function cityRoutes({ trips }: Services): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await trips.listCities());
  });

  return router;
}
