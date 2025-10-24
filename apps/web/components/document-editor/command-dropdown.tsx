import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';

export function commandsDropdown(
    reminders: Array<{
        from: number;
        to: number;
        whenText: string;
        whenISO: string | null;
        status: 'scheduled' | 'overdue' | 'done';
        id?: string | null;
    }>,
    editorRef: React.RefObject<any>
) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    Reminders
                    <Badge variant="outline" className="h-5 text-xs">
                        {reminders.length}
                    </Badge>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                {reminders.length === 0 ? (
                    <DropdownMenuItem disabled>No reminders</DropdownMenuItem>
                ) : (
                    reminders.map((r, idx) => (
                        <DropdownMenuItem
                            key={r.id ?? `${r.from}-${idx}`}
                            asChild
                        >
                            <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => {
                                    setTimeout(() => {
                                        const fn = editorRef.current?.jumpTo;
                                        if (typeof fn === 'function') {
                                            // prefer id-based jump; fallback to numeric pos
                                            (fn as any)(r.id ?? r.from);
                                        }
                                    }, 50);
                                }}
                            >
                                <div className="flex flex-col">
                                    <span className="text-sm">
                                        {r.whenText || 'Reminder'}
                                    </span>
                                    {r.whenISO ? (
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(
                                                r.whenISO
                                            ).toLocaleString()}
                                        </span>
                                    ) : null}
                                </div>
                            </button>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
