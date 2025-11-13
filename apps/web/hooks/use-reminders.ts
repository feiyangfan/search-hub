'use client';

import { useQuery } from '@tanstack/react-query';
import type {
    GetPendingRemindersResponseType,
    ReminderItemType,
} from '@search-hub/schemas';
import { pendingRemindersQueryKey } from '@/queries/reminders';

const defaultFetchInit: RequestInit = {
    credentials: 'include',
};

async function fetchPendingReminders() {
    const response = await fetch('/api/reminders/pending', defaultFetchInit);

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to load reminders');
    }

    return (await response.json()) as GetPendingRemindersResponseType;
}

export function usePendingRemindersQuery() {
    return useQuery({
        queryKey: pendingRemindersQueryKey,
        queryFn: fetchPendingReminders,
        select: (data) => data.reminders as ReminderItemType[],
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
}

