import { z } from 'zod';
import { Id, IsoDate } from './common.js';

export const User = z.object({
    id: Id.meta({
        description: 'User Id',
        example: 'user123',
    }),
    tenantId: Id.meta({
        description: 'Tenant Id',
        example: 'tenant123',
    }),
    email: z.email().meta({
        description: 'User email',
        example: 'user@email.com',
    }),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});

// Schema from Prisma
// model User {
//   id        String   @id @default(cuid())
//   tenantId  String
//   email     String   @unique
//   // future: add role
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt

//   tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
//   @@index([tenantId])
// }
