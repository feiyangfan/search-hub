import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EmptyStateCreateWorkspace } from '@/components/workspace/empty-state-create-workspace';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/auth/sign-in');
    }

    const memberships =
        (session.user as { memberships?: unknown[] })?.memberships ?? [];

    if (memberships.length === 0) {
        return <EmptyStateCreateWorkspace />;
    }

    return <div className="flex m-6 p-6">Dashboard</div>;
}
