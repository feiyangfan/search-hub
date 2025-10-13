import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { SearchHubClient } from '@search-hub/sdk';

// will use zod to validate in the future
// const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

// if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
//     throw new Error('Missing Google OAuth environment variables');
// }

const apiBase = process.env.API_URL ?? 'http://localhost:3000';
const client = new SearchHubClient({
    baseUrl: apiBase,
    fetcher: (input, init) => fetch(input, { ...init, credentials: 'include' }),
});

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
            async authorize(credentials, req) {
                if (!credentials?.email || !credentials?.password) return null;
                const email = credentials.email;
                const password = credentials.password;
                try {
                    const res = await client.signIn({
                        email: email,
                        password: password,
                    });
                    const user = res.user;
                    return { id: user.id, email: user.email }; // add more fields if needed later
                } catch (error) {
                    if ((error as { status?: number }).status === 401) {
                        return null;
                    }
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
        async session({ session, token, user }) {
            // session.currentTenantId = token.currentTenantId
            return session;
        },
        async jwt({ token, user }) {
            return token;
        },
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
