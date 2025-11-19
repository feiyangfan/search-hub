import { AppHeader } from '@/components/layout/app-header';
import { AppProviders } from '@/components/layout/app-providers';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppToaster } from '@/components/layout/app-toaster';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DocumentHeaderProvider } from '@/components/document/document-header-context';

export default async function ChromeLayout({
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
                        <DocumentHeaderProvider>
                            <AppHeader
                                session={session}
                                showSidebarTrigger={hasWorkspaces}
                            />
                            <main className="flex flex-1 flex-col overflow-hidden">
                                {children}
                            </main>
                        </DocumentHeaderProvider>
                    </SidebarInset>
                </div>
            </SidebarProvider>
            <AppToaster />
        </AppProviders>
    );
}
