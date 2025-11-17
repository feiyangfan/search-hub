'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type LucideIcon } from 'lucide-react';

import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

type NavItem = {
    title: string;
    url?: string;
    icon: LucideIcon;
    isActive?: boolean;
    action?: () => void | Promise<void>;
    disabled?: boolean;
    iconClassName?: string;
};

export function NavMain({ items }: { items: NavItem[] }) {
    const pathname = usePathname();

    return (
        <SidebarMenu>
            {items.map((item) => {
                const matchesExact = item.url ? pathname === item.url : false;
                const matchesNested =
                    item.url && item.url !== '#'
                        ? pathname?.startsWith(`${item.url}/`)
                        : false;
                const allowNestedMatch = item.url
                    ? item.url.split('/').length > 2
                    : false;
                const autoActive =
                    item.url && item.url !== '#'
                        ? matchesExact || (allowNestedMatch && matchesNested)
                        : false;
                const isActive = item.isActive ?? autoActive;
                const Icon = item.icon;
                const renderContent = (
                    <>
                        <Icon className={item.iconClassName} />
                        <span>{item.title}</span>
                    </>
                );
                const handleAction = () => {
                    if (!item.action) {
                        return;
                    }
                    try {
                        const maybePromise = item.action();
                        if (
                            maybePromise &&
                            typeof (maybePromise as Promise<unknown>).catch ===
                                'function'
                        ) {
                            (maybePromise as Promise<unknown>).catch(() => {});
                        }
                    } catch {
                        // Errors handled inside the action implementations.
                    }
                };

                return (
                    <SidebarMenuItem key={item.title}>
                        {item.action ? (
                            <SidebarMenuButton
                                type="button"
                                isActive={isActive}
                                onClick={handleAction}
                                disabled={item.disabled}
                            >
                                {renderContent}
                            </SidebarMenuButton>
                        ) : (
                            <SidebarMenuButton asChild isActive={isActive}>
                                <Link href={item.url ?? '#'}>{renderContent}</Link>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                );
            })}
        </SidebarMenu>
    );
}
