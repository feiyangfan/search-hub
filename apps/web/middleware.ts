import { withAuth } from 'next-auth/middleware';

export default withAuth({
    pages: { signIn: '/auth/sign-in' },
});

export const config = {
    matcher: ['/dashboard', '/api/:path*'], // exclude auth routes
};
