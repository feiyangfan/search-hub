import NextAuth from 'next-auth';

declare module 'next-auth' {
    interface Session {
        apiSessionCookie?: string;
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            memberships?: Array<{
                tenantId: string;
                tenantName: string;
                role: 'owner' | 'admin' | 'member';
            }>;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        memberships?: Array<{
            tenantId: string;
            tenantName: string;
            role: 'owner' | 'admin' | 'member';
        }>;
        apiSessionCookie?: string;
    }
}
