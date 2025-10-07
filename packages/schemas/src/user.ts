import { z } from 'zod';
import { Id, IsoDate } from './common.js';

export const User = z.object({
    id: Id.meta({
        description: 'User Id',
        example: 'user123',
    }),
    email: z.email().meta({
        description: 'User email',
        example: 'user@email.com',
    }),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});
