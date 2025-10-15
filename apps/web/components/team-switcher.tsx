import Link from 'next/link';
import { PlusIcon } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TeamSwitcher() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger>Switch team</DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel>Teams</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link
                        href="/dashboard/tenants/new"
                        className="flex items-center gap-2"
                    >
                        <PlusIcon className="size-4" />
                        Create new team
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
