import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type DocumentExplorerFiltersProps = {
    summary: string;
    resultCount: number;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    sortOption: 'newest' | 'oldest';
    onSortChange: (value: 'newest' | 'oldest') => void;
    hasReminderOnly: boolean;
    onHasReminderChange: (value: boolean) => void;
    myDocsOnly: boolean;
    onMyDocsChange: (value: boolean) => void;
};

export function DocumentExplorerFilters({
    summary,
    resultCount,
    searchQuery,
    onSearchChange,
    sortOption,
    onSortChange,
    hasReminderOnly,
    onHasReminderChange,
    myDocsOnly,
    onMyDocsChange,
}: DocumentExplorerFiltersProps) {
    return (
        <Card className="border bg-card">
            <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold">
                            Filters
                        </CardTitle>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Input
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Enter title..."
                        className="h-9 w-full sm:w-[260px]"
                    />
                    <Select
                        value={sortOption}
                        onValueChange={(value: 'newest' | 'oldest') =>
                            onSortChange(value)
                        }
                    >
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Sort order" />
                        </SelectTrigger>
                        <SelectContent align="start">
                            <SelectItem value="newest">Newest first</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                        </SelectContent>
                    </Select>

                    <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                            checked={hasReminderOnly}
                            onCheckedChange={(checked) =>
                                onHasReminderChange(Boolean(checked))
                            }
                        />
                        Has reminder
                    </label>

                    <label className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                            checked={myDocsOnly}
                            onCheckedChange={(checked) =>
                                onMyDocsChange(Boolean(checked))
                            }
                        />
                        My docs
                    </label>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">More filters</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuLabel>More filters</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem disabled>
                                None available
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
        </Card>
    );
}
