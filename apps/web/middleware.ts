import { withAuth } from 'next-auth/middleware';

export default withAuth({
    pages: { signIn: '/auth/sign-in' },
});

export const config = {
    matcher: [
        '/dashboard/:path*', // Protect all dashboard routes
        '/doc/:path*', // Protect all document routes
        '/api/:path*', // Protect all API routes (except those explicitly excluded below)
        '/documents/:path*', // Protect all document-related API routes
        // Note: NextAuth automatically excludes /api/auth/* from withAuth
    ],
};
