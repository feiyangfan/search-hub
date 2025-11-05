import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type TagOption = {
    id: string;
    name: string;
    color: string;
    description?: string;
};

export const DEFAULT_TAG_COLOR = '#6366f1';

export const PRESET_TAG_COLORS = [
    '#6366f1',
    '#0ea5e9',
    '#14b8a6',
    '#22c55e',
    '#facc15',
    '#f97316',
    '#ec4899',
    '#a855f7',
    '#ef4444',
    '#8b5cf6',
];

/**
 * Utility to convert hex color to rgba with specified alpha
 */
export function hexToRgba(hex: string, alpha: number): string {
    let sanitized = hex.replace('#', '');
    if (sanitized.length === 3) {
        sanitized = sanitized
            .split('')
            .map((char) => char + char)
            .join('');
    }
    const bigint = parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get badge style with tag color
 */
export function getTagBadgeStyle(color: string): CSSProperties {
    const background = hexToRgba(color, 0.15);
    return {
        backgroundColor: background,
        borderColor: color,
        color,
    };
}

type TagProps = {
    tag: TagOption;
    variant?: 'default' | 'removable';
    onRemove?: () => void;
    className?: string;
};

/**
 * Tag component - displays a tag badge with optional remove button
 */
export function Tag({ tag, variant = 'default', onRemove, className }: TagProps) {
    if (variant === 'removable') {
        return (
            <Badge
                variant="secondary"
                className={`inline-flex items-center gap-2 pr-1 ${className ?? ''}`}
                style={getTagBadgeStyle(tag.color)}
                title={tag.description}
            >
                {tag.name}
                <button
                    type="button"
                    aria-label={`Remove ${tag.name}`}
                    className="rounded-sm p-1 hover:bg-muted/80"
                    onClick={onRemove}
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </Badge>
        );
    }

    return (
        <Badge
            variant="secondary"
            className={`w-fit font-medium ${className ?? ''}`}
            style={getTagBadgeStyle(tag.color)}
            title={tag.description}
        >
            {tag.name}
        </Badge>
    );
}
