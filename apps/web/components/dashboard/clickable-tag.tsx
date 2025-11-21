'use client';

import Link from 'next/link';
import { Tag, type TagOption } from '@/components/ui/tag';
import { Badge } from '@/components/ui/badge';

type ClickableTagProps = {
    tag: TagOption;
    href: string;
    count?: number;
};

export function ClickableTag({ tag, href, count }: ClickableTagProps) {
    return (
        <Link href={href} className="w-fit">
            <span className="relative inline-flex">
                <Tag tag={tag} className="pr-4" />
                {typeof count === 'number' && (
                    <Badge
                        variant="secondary"
                        className="absolute -top-2 -right-2 h-5 min-w-[1.5rem] justify-center px-1 text-[10px] bg-white"
                    >
                        {count}
                    </Badge>
                )}
            </span>
        </Link>
    );
}
