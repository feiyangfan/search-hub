'use client';

import { useRouter } from 'next/navigation';

import { CreateWorkspaceCard } from '@/components/create-workspace-card';

export function EmptyStateCreateWorkspace() {
    const router = useRouter();

    return (
        <div className="flex flex-1 items-center justify-center px-6 py-16">
            <div className="max-w-xl flex-1 space-y-6">
                <div className="space-y-2 text-center md:text-left">
                    <h2 className="text-3xl font-semibold tracking-tight">
                        Create your first workspace
                    </h2>
                </div>
                <CreateWorkspaceCard
                    className="shadow-lg"
                    onSuccess={() => router.refresh()}
                />
            </div>
        </div>
    );
}
