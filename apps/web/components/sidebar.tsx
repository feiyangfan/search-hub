'use client';

import type { ComponentType, SVGProps } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Session } from 'next-auth';
import {
    ActivityIcon,
    FileTextIcon,
    LayoutDashboardIcon,
    SearchIcon,
} from 'lucide-react';

import { TeamSwitcher } from './team-switcher';
import { UserProfileIcon } from './user-profile-icon';

type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type SidebarProps = {
    workspaceName?: string;
    user: Session['user'];
    documents?: Array<{ id: string; title: string; href: string }>;
};

const PRIMARY_NAV: NavItem[] = [
    { label: 'Search', href: '/search', icon: SearchIcon },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboardIcon },
    { label: 'Activity', href: '/activity', icon: ActivityIcon },
];

function NavLink({ item }: { item: NavItem }) {
    const pathname = usePathname();
    const isActive =
        pathname === item.href ||
        (item.href !== '/' && pathname?.startsWith(item.href));

    const Icon = item.icon;

    return (
        <Link
            href={item.href}
            className={[
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ].join(' ')}
        >
            <Icon className="size-4" />
            {item.label}
        </Link>
    );
}

export function Sidebar({
    workspaceName,
    user,
    documents = [],
}: SidebarProps) {
    return (
        <aside className="hidden w-64 flex-col border-r bg-background lg:flex">
            <div className="border-b px-4 py-5">
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                            Workspace
                        </p>
                        <p className="text-sm font-medium">
                            {workspaceName ?? 'Current workspace'}
                        </p>
                    </div>
                    <TeamSwitcher />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
                <nav className="space-y-6">
                    <div className="space-y-1">
                        {PRIMARY_NAV.map((item) => (
                            <NavLink key={item.href} item={item} />
                        ))}
                    </div>

                    <div>
                        <div className="px-3 pb-2 text-xs font-semibold uppercase text-muted-foreground">
                            Documents
                        </div>
                        <div className="space-y-1">
                            {documents.length === 0 ? (
                                <button
                                    type="button"
                                    className="w-full rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted"
                                >
                                    Add first document
                                </button>
                            ) : (
                                documents.map((doc) => (
                                    <Link
                                        key={doc.id}
                                        href={doc.href}
                                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                    >
                                        <FileTextIcon className="size-4" />
                                        <span className="truncate">
                                            {doc.title}
                                        </span>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </nav>
            </div>

            <div className="border-t px-4 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase text-muted-foreground">
                            User
                        </p>
                        <p className="text-sm font-medium">
                            {user?.name ?? user?.email ?? 'Current user'}
                        </p>
                    </div>
                    <UserProfileIcon user={user} />
                </div>
            </div>
        </aside>
    );
}
