import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppHeader } from '@/components/app-header';
import { AppSidebar } from '@/components/app-sidebar';
import { AppToaster } from '@/components/app-toaster';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Search Hub',
    description: 'Hybird search engine for all your needs.',
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await getServerSession(authOptions);
    const memberships =
        (
            session?.user as {
                memberships?: Array<{ tenantName: string; role?: string }>;
            }
        )?.memberships ?? [];
    const workspaces = memberships.map((membership) => ({
        name: membership.tenantName,
        role: membership.role,
    }));

    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <SidebarProvider>
                    <div className="flex min-h-dvh w-full">
                        {session ? (
                            <AppSidebar
                                user={session.user}
                                workspaces={workspaces}
                            />
                        ) : null}
                        <SidebarInset>
                            <AppHeader session={session} />
                            <main className="flex flex-1 flex-col">
                                {children}
                            </main>
                        </SidebarInset>
                    </div>
                </SidebarProvider>
                <AppToaster />
            </body>
        </html>
    );
}
