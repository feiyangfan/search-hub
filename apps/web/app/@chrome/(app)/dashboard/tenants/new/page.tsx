import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { CreateWorkspacePanel } from '@/components/workspace/create-workspace-panel';

export default async function TenantOnboardingPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/auth/sign-in');
    }

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 lg:px-0">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                    Create a new workspace
                </h1>
                <p className="text-muted-foreground mt-1 text-base">
                    Workspaces keep your content, search history, and
                    permissions organised. Use this form to add another
                    workspace for your team.
                </p>
            </div>
            <CreateWorkspacePanel className="shadow-lg" />
        </div>
    );
}
