import type { NewUser, User } from '../domain/types.ts';
import { NotFoundError } from '../errors.ts';
import type { Store } from '../repositories/types.ts';

export function createUserService(store: Store) {
  return {
    register(input: NewUser): Promise<User> {
      return store.users.create(input);
    },

    async findByEmail(email: string): Promise<User> {
      const user = await store.users.findByEmail(email);
      if (!user) throw new NotFoundError('No traveller is registered with that email');
      return user;
    },
  };
}

export type UserService = ReturnType<typeof createUserService>;
