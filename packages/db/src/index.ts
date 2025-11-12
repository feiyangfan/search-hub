import { tagRepository } from './repositories/tag.repository.js';
import { userRepository } from './repositories/user.repository.js';
import { tenantRepository } from './repositories/tenant.repository.js';
import { documentRepository } from './repositories/document.repository.js';
import { jobRepository } from './repositories/job.repository.js';
import { tenantMembershipRepository } from './repositories/tenantMembership.repository.js';
import { documentIndexStateRepository } from './repositories/documentIndexState.repository.js';
import { documentCommandRepository } from './repositories/documentCommand.repository.js';

// Re-exports
export { prisma } from './client.js';
export type { PrismaClient } from './client.js';
export type { UserTenant } from './types.js';

export const db = {
    user: userRepository,
    tenant: tenantRepository,
    document: documentRepository,
    tag: tagRepository,
    job: jobRepository,
    tenantMembership: tenantMembershipRepository,
    documentIndexState: documentIndexStateRepository,
    documentCommand: documentCommandRepository,
};
