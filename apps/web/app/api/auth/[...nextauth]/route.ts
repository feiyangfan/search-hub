import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { SearchHubClient } from '@search-hub/sdk';

// will use zod to validate in the future
// const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

// if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
//     throw new Error('Missing Google OAuth environment variables');
// }

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export const authOptions: NextAuthOptions = {
    providers: [
        // GoogleProvider({
        //     clientId: GOOGLE_CLIENT_ID,
        //     clientSecret: GOOGLE_CLIENT_SECRET,
        // }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: {
                    label: 'Email',
                    type: 'email',
                    placeholder: 'jsmith@email.com',
                },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                const email = credentials.email;
                const password = credentials.password;
                try {
                    let apiSessionCookie: string | undefined;
                    const client = new SearchHubClient({
                        baseUrl: apiBase,
                        // Custom fetcher so we can capture the connect.sid cookie set by the API.
                        fetcher: async (input, init) => {
                            const response = await fetch(input, {
                                ...init,
                                credentials: 'include',
                            });
                            const headerWithGet =
                                response.headers as unknown as {
                                    getSetCookie?: () => string[];
                                };
                            const setCookies =
                                headerWithGet.getSetCookie?.() ?? [];
                            const rawCookie =
                                setCookies.find((cookie) =>
                                    cookie.startsWith('connect.sid=')
                                ) ??
                                response.headers.get('set-cookie') ??
                                undefined;
                            if (rawCookie) {
                                apiSessionCookie = rawCookie.split(';')[0];
                            }
                            return response;
                        },
                    });

                    const res = await client.signIn({
                        email,
                        password,
                    });

                    const user = res.user;
                    const memberships = user.memberships ?? [];

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.email,
                        memberships: user.memberships ?? [],
                        apiSessionCookie,
                        // Prefer the API-selected tenant; fall back to the first membership when none selected.
                        currentTenantId:
                            (res.session?.currentTenantId as
                                | string
                                | undefined) ?? memberships[0]?.tenantId,
                    };
                } catch {
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
    pages: {
        signIn: '/auth/sign-in',
        signOut: '/auth/sign-out',
    },
    callbacks: {
        async session({ session, token }) {
            const apiSessionCookie = token.apiSessionCookie;

            if (session.user && apiSessionCookie) {
                const client = new SearchHubClient({
                    baseUrl: apiBase,
                    headers: { cookie: apiSessionCookie },
                });

                try {
                    const { tenants, activeTenantId } =
                        await client.listTenants();

                    session.user.memberships = tenants;
                    token.memberships = tenants;

                    const memberships = tenants;
                    // Ensure the resolved active tenant actually exists in the refreshed membership list.
                    const membershipIds = new Set(
                        memberships.map((m) => m.tenantId)
                    );

                    const candidate =
                        activeTenantId ??
                        token.activeTenantId ??
                        memberships[0]?.tenantId;

                    const resolvedActive =
                        candidate && membershipIds.has(candidate)
                            ? candidate
                            : memberships[0]?.tenantId ?? undefined;

                    session.activeTenantId = resolvedActive;
                    token.activeTenantId = resolvedActive;
                } catch {
                    session.user.memberships = token.memberships ?? [];
                    if (!session.activeTenantId) {
                        session.activeTenantId =
                            token.activeTenantId ?? undefined;
                    }
                }
            } else if (session.user) {
                session.user.memberships = token.memberships ?? [];
                session.activeTenantId = token.activeTenantId ?? undefined;
            }

            session.apiSessionCookie = apiSessionCookie;
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.memberships = user.memberships ?? [];
                token.apiSessionCookie = user.apiSessionCookie;
                token.activeTenantId =
                    user.currentTenantId ??
                    token.activeTenantId ??
                    user.memberships?.[0]?.tenantId;
            }
            return token;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
