/**
 * Shared types used across database repositories
 */

export interface UserTenant {
    tenantId: string;
    tenantName: string;
    role: 'owner' | 'admin' | 'member';
}
