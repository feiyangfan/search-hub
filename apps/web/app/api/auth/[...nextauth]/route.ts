import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { SearchHubClient } from '@search-hub/sdk';

// will use zod to validate in the future
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing Google OAuth environment variables');
}

const apiBase = process.env.API_URL ?? 'http://localhost:3000';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
        }),
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
                        name: user.name ?? user.email,
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
        async signIn({ account, profile, user }) {
            if (account?.provider !== 'google') return true;
            if (!profile?.email) {
                return false;
            }

            if (!account?.id_token) {
                return false;
            }

            let apiSessionCookie: string | undefined;
            const client = new SearchHubClient({
                baseUrl: apiBase,
                fetcher: async (input, init) => {
                    const response = await fetch(input, {
                        ...init,
                        credentials: 'include',
                    });
                    const headerWithGet = response.headers as unknown as {
                        getSetCookie?: () => string[];
                    };
                    const setCookies = headerWithGet.getSetCookie?.() ?? [];
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

            const result = await client.oauthSignIn({
                provider: 'google',
                idToken: account.id_token,
            });

            // Attach custom data so jwt/session callbacks can reuse it.
            user.id = result.user.id;
            user.memberships = result.user.memberships ?? [];
            user.apiSessionCookie = apiSessionCookie;
            user.currentTenantId =
                result.session?.currentTenantId ??
                result.user.memberships?.[0]?.tenantId;
            return true;
        },
        async session({ session, token, trigger }) {
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

                    // Clear any previous error flag
                    session.error = undefined;
                } catch (error) {
                    // If API session is invalid (401), mark session as requiring re-auth
                    // This happens when backend restarts and Redis sessions are cleared
                    if (
                        error &&
                        typeof error === 'object' &&
                        'status' in error &&
                        error.status === 401
                    ) {
                        console.log(
                            'Backend session expired (401), user needs to re-authenticate'
                        );
                        // Mark session with error so frontend can detect and force sign-in
                        session.error = 'BackendSessionExpired';
                        // Clear the API session cookie from the token for next refresh
                        token.apiSessionCookie = undefined;
                    } else {
                        // For other errors (network issues, etc.), fall back to cached data
                        session.user.memberships = token.memberships ?? [];
                        if (!session.activeTenantId) {
                            session.activeTenantId =
                                token.activeTenantId ?? undefined;
                        }
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
