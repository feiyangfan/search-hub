'use client';

import Link from 'next/link';
import { Tag, type TagOption } from '@/components/ui/tag';

type ClickableTagProps = {
    tag: TagOption;
    href: string;
};

export function ClickableTag({ tag, href }: ClickableTagProps) {
    return (
        <Link href={href} className="w-fit">
            <Tag tag={tag} />
        </Link>
    );
}
