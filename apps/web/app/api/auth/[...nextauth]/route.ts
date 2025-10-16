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

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.email,
                        memberships: user.memberships ?? [],
                        apiSessionCookie,
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
            const apiSessionCookie = (token as { apiSessionCookie?: string })
                .apiSessionCookie;

            if (session.user && apiSessionCookie) {
                const client = new SearchHubClient({
                    baseUrl: apiBase,
                    headers: { cookie: apiSessionCookie },
                });

                try {
                    const memberships = await client.listTenants();

                    session.user.memberships = memberships;
                    token.memberships = memberships;
                } catch {
                    session.user.memberships = token.memberships ?? [];
                }
            } else if (session.user) {
                session.user.memberships = token.memberships ?? [];
            }

            session.apiSessionCookie = apiSessionCookie;
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                (token as { memberships?: unknown[] }).memberships =
                    (user as { memberships?: unknown[] }).memberships ?? [];
                (token as { apiSessionCookie?: string }).apiSessionCookie = (
                    user as { apiSessionCookie?: string }
                ).apiSessionCookie;
            }
            return token;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
