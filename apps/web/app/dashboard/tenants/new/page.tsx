import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function TenantOnboardingPage() {
    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10 lg:px-0">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">
                    Create a new workspace
                </h1>
                <p className="text-muted-foreground mt-1 text-base">
                    Set up a tenant so your team can capture documents, run
                    searches, and manage permissions together.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Workspace details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Workspace name</Label>
                        <Input
                            id="name"
                            placeholder="Acme Search Ops"
                            autoComplete="organization"
                            disabled
                        />
                        <p className="text-muted-foreground text-xs">
                            {/* eslint-disable-next-line max-len */}
                            This is just a placeholder form. Wire it to the
                            tenant creation API when ready.
                        </p>
                    </div>

                    <Separator />

                    <div className="grid gap-2">
                        <Label htmlFor="slug">Workspace slug</Label>
                        <Input
                            id="slug"
                            placeholder="acme-search-ops"
                            autoComplete="off"
                            disabled
                        />
                        <p className="text-muted-foreground text-xs">
                            Slug will appear in URLs and API requests.
                        </p>
                    </div>

                    <Button type="button" disabled className="w-full sm:w-auto">
                        Create workspace
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
