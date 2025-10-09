import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

// will use zod to validate in the future
// const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

// if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
//     throw new Error('Missing Google OAuth environment variables');
// }

export const authOptions: NextAuthOptions = {
    providers: [
        // GoogleProvider({
        //     clientId: GOOGLE_CLIENT_ID,
        //     clientSecret: GOOGLE_CLIENT_SECRET,
        // }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: {
                    label: 'Username',
                    type: 'text',
                    placeholder: 'jsmith',
                },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials, req) {
                const user = {
                    id: '1',
                    name: 'J Smith',
                    email: 'jsmith@example.com',
                };
                if (user) {
                    return user;
                }
                return null;
            },
        }),
    ],
    pages: {
        signIn: '/auth/sign-in',
        signOut: '/auth/sign-out',
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
