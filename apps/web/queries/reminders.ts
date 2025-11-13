export const pendingRemindersQueryKey = (tenantId?: string) =>
    ['reminders', tenantId ?? 'unknown', 'pending'] as const;
