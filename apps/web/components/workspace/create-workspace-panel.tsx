'use client';

import { useRouter } from 'next/navigation';

import { CreateWorkspaceCard } from './create-workspace-card';

type CreateWorkspacePanelProps = {
    className?: string;
    redirectTo?: string;
};

export function CreateWorkspacePanel({
    className,
    redirectTo = '/dashboard',
}: CreateWorkspacePanelProps) {
    const router = useRouter();

    return (
        <CreateWorkspaceCard
            className={className}
            onSuccess={() => {
                router.push(redirectTo);
                // Ensure new session data is picked up when destination loads
                router.refresh();
            }}
        />
    );
}
