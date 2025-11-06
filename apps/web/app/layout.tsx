import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppHeader } from '@/components/layout/app-header';
import { AppProviders } from '@/components/layout/app-providers';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppToaster } from '@/components/layout/app-toaster';
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

    const memberships = session?.user.memberships ?? [];

    const workspaces = memberships.map((membership) => ({
        id: membership.tenantId,
        name: membership.tenantName,
        role: membership.role,
    }));
    const hasWorkspaces = workspaces.length > 0;
    const activeTenantId = session?.activeTenantId;

    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <AppProviders session={session}>
                    <SidebarProvider>
                        <div className="flex min-h-dvh w-full">
                            {session && hasWorkspaces ? (
                                <AppSidebar
                                    user={session.user}
                                    workspaces={workspaces}
                                    activeTenantId={activeTenantId}
                                />
                            ) : null}
                            <SidebarInset>
                                <AppHeader
                                    session={session}
                                    showSidebarTrigger={hasWorkspaces}
                                />
                                <main className="flex-1 overflow-hidden">
                                    {children}
                                </main>
                            </SidebarInset>
                        </div>
                    </SidebarProvider>
                    <AppToaster />
                </AppProviders>
            </body>
        </html>
    );
}
