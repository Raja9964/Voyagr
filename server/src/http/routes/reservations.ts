import { Router } from 'express';
import type { Services } from '../../services/index.ts';
import { createReservationSchema, idSchema } from '../schemas.ts';

export function reservationRoutes({ reservations }: Services): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const reservation = await reservations.book(createReservationSchema.parse(req.body));
    res.status(201).location(`/api/reservations/${reservation.id}`).json(reservation);
  });

  router.get('/:id', async (req, res) => {
    res.json(await reservations.get(idSchema.parse(req.params.id)));
  });

  router.post('/:id/cancel', async (req, res) => {
    res.json(await reservations.cancel(idSchema.parse(req.params.id)));
  });

  return router;
}
