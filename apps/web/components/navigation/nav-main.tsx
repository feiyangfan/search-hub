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
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
};

export function NavMain({ items }: { items: NavItem[] }) {
    const pathname = usePathname();

    return (
        <SidebarMenu>
            {items.map((item) => {
                const matchesExact = pathname === item.url;
                const matchesNested =
                    item.url !== '#'
                        ? pathname?.startsWith(`${item.url}/`)
                        : false;
                const allowNestedMatch = item.url.split('/').length > 2;
                const autoActive =
                    item.url !== '#'
                        ? matchesExact || (allowNestedMatch && matchesNested)
                        : false;
                const isActive = item.isActive ?? autoActive;

                return (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                            <Link href={item.url}>
                                <item.icon />
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                );
            })}
        </SidebarMenu>
    );
}
