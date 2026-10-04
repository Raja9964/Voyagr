import { Router } from 'express';
import type { Services } from '../../services/index.ts';
import { idSchema, registerUserSchema, userLookupSchema } from '../schemas.ts';

export function userRoutes({ users, reservations }: Services): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const user = await users.register(registerUserSchema.parse(req.body));
    res.status(201).location(`/api/users/${user.id}`).json(user);
  });

  router.get('/lookup', async (req, res) => {
    const { email } = userLookupSchema.parse(req.query);
    res.json(await users.findByEmail(email));
  });

  router.get('/:id/reservations', async (req, res) => {
    res.json(await reservations.listForUser(idSchema.parse(req.params.id)));
  });

  return router;
}
