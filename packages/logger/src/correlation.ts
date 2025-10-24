import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

interface RequestContext {
    traceId: string;
    userId?: string;
    tenantId?: string;
    sessionId?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext() {
    return asyncLocalStorage.getStore();
}

export function setRequestContext(context: RequestContext) {
    asyncLocalStorage.enterWith(context);
}

export function generateTraceId() {
    return `trace-${randomUUID()}`;
}

// Helper to get trace Id for logging
export function getTraceId(): string | undefined {
    return getRequestContext()?.traceId;
}
