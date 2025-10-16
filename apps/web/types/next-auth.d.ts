import 'next-auth';
import 'next-auth/jwt';

export type MembershipSummary = {
    tenantId: string;
    tenantName: string;
    role: 'owner' | 'admin' | 'member';
};

declare module 'next-auth' {
    interface Session {
        apiSessionCookie?: string;
        activeTenantId?: string;
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            memberships?: MembershipSummary[];
        };
    }

    interface User {
        memberships?: MembershipSummary[];
        apiSessionCookie?: string;
        currentTenantId?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        memberships?: MembershipSummary[];
        apiSessionCookie?: string;
        activeTenantId?: string;
    }
}
