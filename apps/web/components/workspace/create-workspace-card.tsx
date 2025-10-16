'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export interface CreateWorkspaceCardProps {
    className?: string;
    onSuccess?: (tenant: { id?: string; name?: string }) => void;
}

export function CreateWorkspaceCard({
    className,
    onSuccess,
}: CreateWorkspaceCardProps) {
    const { toast } = useToast();
    const [workspaceName, setWorkspaceName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!workspaceName.trim()) {
            setError('Workspace name is required.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/tenants', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({ name: workspaceName.trim() }),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => null)) as {
                    error?: string;
                } | null;
                const message =
                    data?.error ??
                    'Unable to create workspace. Please try again.';
                setError(message);
                toast.error('Something went wrong', { description: message });
                return;
            }

            const tenant = (await response.json().catch(() => null)) as {
                id?: string;
                name?: string;
            } | null;

            toast.success('Workspace created', {
                description: `${
                    tenant?.name ?? workspaceName.trim()
                } is ready to go.`,
            });

            setWorkspaceName('');
            onSuccess?.({ id: tenant?.id, name: tenant?.name });
        } catch (err) {
            const message =
                (err as { message?: string }).message ??
                'Unable to create workspace. Please try again.';
            setError(message);
            toast.error('Something went wrong', { description: message });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Create workspace</CardTitle>
                <CardDescription>
                    Workspaces keep your content, search history, and
                    permissions organised. Create one to start using Search Hub
                    with your team.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                        • Invite teammates to collaborate, ingest documents, and
                        run searches together.
                    </p>
                    <p>
                        • Track activity, manage roles, and configure
                        integrations from a single place.
                    </p>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <Label htmlFor="workspace-name">Workspace name</Label>
                        <Input
                            id="workspace-name"
                            placeholder="My workspace"
                            value={workspaceName}
                            onChange={(event) =>
                                setWorkspaceName(event.target.value)
                            }
                            disabled={isSubmitting}
                            aria-invalid={error ? 'true' : 'false'}
                        />
                        {error ? (
                            <p className="text-sm text-destructive">{error}</p>
                        ) : null}
                    </div>
                    <Button
                        type="submit"
                        className="w-full sm:w-auto"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creating…' : 'Create workspace'}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
                You can add more workspaces later from the workspace switcher.
            </CardFooter>
        </Card>
    );
}
