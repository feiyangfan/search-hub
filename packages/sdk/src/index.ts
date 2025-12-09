import type { paths } from './types';

export type Fetcher = (
    input: RequestInfo,
    init?: RequestInit
) => Promise<Response>;

export interface ClientOptions {
    baseUrl?: string;
    fetcher?: Fetcher;
    headers?: Record<string, string>;
}

export class SearchHubClient {
    private baseUrl: string;
    private fetcher: Fetcher;
    private defaultHeaders: Record<string, string>;

    constructor(options: ClientOptions = {}) {
        this.baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '');
        this.fetcher = options.fetcher ?? (globalThis.fetch as Fetcher);
        this.defaultHeaders = { ...(options.headers ?? {}) };
    }

    /** PATCH /v1/documents/{id}/icon */
    async updateDocumentIcon(
        id: string,
        body: paths['/v1/documents/{id}/icon']['patch']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/documents/{id}/icon']['patch']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(
            id
        )}/icon`;
        const res = await this.fetcher(url, {
            method: 'PATCH',
            headers: {
                'content-type': 'application/json',
                ...this.defaultHeaders,
            },
            body: JSON.stringify(body),
        });

        await this.ensureOk(res, 'updateDocumentIcon');
        return (await res.json()) as paths['/v1/documents/{id}/icon']['patch']['responses']['200']['content']['application/json'];
    }

    /** Small helper to throw readable errors on non-2xx */
    private async ensureOk(res: Response, operation: string) {
        if (res.ok) {
            return;
        }

        const txt = await safeText(res);
        let parsedBody: unknown = undefined;

        if (txt) {
            try {
                parsedBody = JSON.parse(txt);
            } catch {
                parsedBody = txt;
            }
        }

        const err = new Error(
            `${operation} failed: ${res.status} ${res.statusText}`
        );
        Object.assign(err, {
            status: res.status,
            statusText: res.statusText,
            body: parsedBody,
            rawBody: txt,
        });
        throw err;
    }

    /** POST /v1/auth/sign-up */
    async signUp(
        body: paths['/v1/auth/sign-up']['post']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/auth/sign-up']['post']['responses']['201']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/auth/sign-up`;
        const res = await this.fetcher(url, {
            method: 'post',
            headers: {
                'content-type': 'application/json',
                ...this.defaultHeaders,
            },
            body: JSON.stringify(body),
        });

        await this.ensureOk(res, 'signUp');
        return (await res.json()) as paths['/v1/auth/sign-up']['post']['responses']['201']['content']['application/json'];
    }

    /** POST /v1/auth/sign-in */
    async signIn(
        body: paths['/v1/auth/sign-in']['post']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/auth/sign-in']['post']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/auth/sign-in`;
        const res = await this.fetcher(url, {
            method: 'post',
            headers: {
                'content-type': 'application/json',
                ...this.defaultHeaders,
            },
            body: JSON.stringify(body),
        });

        await this.ensureOk(res, 'signIn');
        return (await res.json()) as paths['/v1/auth/sign-in']['post']['responses']['200']['content']['application/json'];
    }

    /** POST /v1/auth/oauth/sign-in */
    async oauthSignIn(
        body: paths['/v1/auth/oauth/sign-in']['post']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/auth/oauth/sign-in']['post']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/auth/oauth/sign-in`;
        const res = await this.fetcher(url, {
            method: 'post',
            headers: {
                'content-type': 'application/json',
                ...this.defaultHeaders,
            },
            body: JSON.stringify(body),
        });

        await this.ensureOk(res, 'oauthSignIn');
        return (await res.json()) as paths['/v1/auth/oauth/sign-in']['post']['responses']['200']['content']['application/json'];
    }

    /** POST /v1/auth/sign-out */
    async signOut(): Promise<void> {
        const url = `${this.baseUrl}/v1/auth/sign-out`;
        const res = await this.fetcher(url, {
            method: 'post',
            headers: {
                ...this.defaultHeaders,
            },
        });
        await this.ensureOk(res, 'signOut');
    }

    /** DELETE /v1/users */
    async deleteUser(): Promise<void> {
        const url = `${this.baseUrl}/v1/users`;
        const res = await this.fetcher(url, {
            method: 'delete',
            headers: {
                ...this.defaultHeaders,
            },
        });
        await this.ensureOk(res, 'userDeleteSelf');
    }

    /** POST /v1/tenant */
    async createTenant(
        body: paths['/v1/tenants']['post']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/tenants']['post']['responses']['201']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/tenants`;
        const res = await this.fetcher(url, {
            method: 'POST',
            headers: {
                ...this.defaultHeaders,
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (res.status !== 200 && res.status !== 201) {
            const txt = await safeText(res);
            throw new Error(
                `createTenant failed: ${res.status} ${res.statusText} ${
                    txt ?? ''
                }`
            );
        }

        return (await res.json()) as paths['/v1/tenants']['post']['responses']['201']['content']['application/json'];
    }

    /** DELETE /v1/tenants */
    async deleteTenant(
        body: paths['/v1/tenants']['delete']['requestBody']['content']['application/json']
    ): Promise<void> {
        const url = `${this.baseUrl}/v1/tenants`;
        const res = await this.fetcher(url, {
            method: 'DELETE',
            headers: {
                ...this.defaultHeaders,
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        await this.ensureOk(res, 'tenantDeletion');
    }

    /** POST /v1/tenants/active */
    async setActiveTenant(
        body: paths['/v1/tenants/active']['post']['requestBody']['content']['application/json']
    ): Promise<void> {
        const url = `${this.baseUrl}/v1/tenants/active`;
        const res = await this.fetcher(url, {
            method: 'POST',
            headers: {
                ...this.defaultHeaders,
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (res.status !== 204) {
            await this.ensureOk(res, 'setActiveTenant');
        }
    }

    /** GET /v1/tenants */
    async listTenants(): Promise<
        paths['/v1/tenants']['get']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/tenants`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'listTenants');
        return (await res.json()) as paths['/v1/tenants']['get']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/tenants/{tenantId}/stats */
    async getTenantStats(
        tenantId: string
    ): Promise<
        paths['/v1/tenants/{tenantId}/stats']['get']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/tenants/${tenantId}/stats`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'getTenantStats');
        return (await res.json()) as paths['/v1/tenants/{tenantId}/stats']['get']['responses']['200']['content']['application/json'];
    }

    /** POST /v1/document */
    async createDocument(
        body: paths['/v1/documents']['post']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/documents']['post']['responses']['202']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/documents`;
        const res = await this.fetcher(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...this.defaultHeaders,
            },
            body: JSON.stringify(body),
        });

        if (res.status !== 202) {
            const txt = await safeText(res);
            throw new Error(
                `createDocument failed: ${res.status} ${res.statusText} ${
                    txt ?? ''
                }`
            );
        }
        return (await res.json()) as paths['/v1/documents']['post']['responses']['202']['content']['application/json'];
    }

    /** GET /v1/documents */
    async listDocuments(
        params: paths['/v1/documents']['get']['parameters']['query'] = {}
    ): Promise<
        paths['/v1/documents']['get']['responses']['200']['content']['application/json']
    > {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                return;
            }
            searchParams.set(key, String(value));
        });

        const qs = searchParams.toString();
        const url = `${this.baseUrl}/v1/documents${qs ? `?${qs}` : ''}`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'listDocuments');
        return (await res.json()) as paths['/v1/documents']['get']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/documents/{id} */
    async getDocumentDetails(
        id: string
    ): Promise<
        paths['/v1/documents/{id}']['get']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(id)}`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'getDocumentDetails');
        return (await res.json()) as paths['/v1/documents/{id}']['get']['responses']['200']['content']['application/json'];
    }

    /** DELETE /v1/documents/{id} */
    async deleteDocument(id: string): Promise<void> {
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(id)}`;
        const res = await this.fetcher(url, {
            method: 'DELETE',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'deleteDocument');
    }

    /** PATCH /v1/documents/{id}/title */
    async updateDocumentTitle(
        id: string,
        body: paths['/v1/documents/{id}/title']['patch']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/documents/{id}/title']['patch']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(
            id
        )}/title`;
        const res = await this.fetcher(url, {
            method: 'PATCH',
            headers: {
                'content-type': 'application/json',
                ...this.defaultHeaders,
            },
            body: JSON.stringify(body),
        });

        await this.ensureOk(res, 'updateDocumentTitle');
        return (await res.json()) as paths['/v1/documents/{id}/title']['patch']['responses']['200']['content']['application/json'];
    }

    /** PATCH /v1/documents/{id}/content */
    async updateDocumentContent(
        id: string,
        body: paths['/v1/documents/{id}/content']['patch']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/documents/{id}/content']['patch']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(
            id
        )}/content`;
        const res = await this.fetcher(url, {
            method: 'PATCH',
            headers: {
                'content-type': 'application/json',
                ...this.defaultHeaders,
            },
            body: JSON.stringify(body),
        });

        await this.ensureOk(res, 'updateDocumentContent');
        return (await res.json()) as paths['/v1/documents/{id}/content']['patch']['responses']['200']['content']['application/json'];
    }

    /** POST /v1/documents/{id}/reindex */
    async reindexDocument(id: string, opts?: { reindex?: boolean }): Promise<void> {
        const params = new URLSearchParams();
        if (opts?.reindex) {
            params.set('reindex', 'true');
        }
        const query = params.toString();
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(
            id
        )}/reindex${query ? `?${query}` : ''}`;
        const res = await this.fetcher(url, {
            method: 'POST',
            headers: {
                ...this.defaultHeaders,
            },
        });

        await this.ensureOk(res, 'reindexDocument');
    }

    /** POST /v1/documents/{id}/favorite */
    async favoriteDocument(
        id: string
    ): Promise<
        paths['/v1/documents/{id}/favorite']['post']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(
            id
        )}/favorite`;
        const res = await this.fetcher(url, {
            method: 'POST',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'favoriteDocument');
        return (await res.json()) as paths['/v1/documents/{id}/favorite']['post']['responses']['200']['content']['application/json'];
    }

    /** POST /v1/documents/{id}/unfavorite */
    async unfavoriteDocument(
        id: string
    ): Promise<
        paths['/v1/documents/{id}/unfavorite']['post']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(
            id
        )}/unfavorite`;
        const res = await this.fetcher(url, {
            method: 'POST',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'unfavoriteDocument');
        return (await res.json()) as paths['/v1/documents/{id}/unfavorite']['post']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/documents/{id}/tags */
    async getDocumentTags(
        id: string
    ): Promise<
        paths['/v1/documents/{id}/tags']['get']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(
            id
        )}/tags`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'getDocumentTags');
        return (await res.json()) as paths['/v1/documents/{id}/tags']['get']['responses']['200']['content']['application/json'];
    }

    /** POST /v1/documents/{id}/tags */
    async addTagsToDocument(
        id: string,
        body: paths['/v1/documents/{id}/tags']['post']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/documents/{id}/tags']['post']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(
            id
        )}/tags`;
        const res = await this.fetcher(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...this.defaultHeaders,
            },
            body: JSON.stringify(body),
        });

        await this.ensureOk(res, 'addTagsToDocument');
        return (await res.json()) as paths['/v1/documents/{id}/tags']['post']['responses']['200']['content']['application/json'];
    }

    /** DELETE /v1/documents/{id}/tags/{tagId} */
    async removeTagFromDocument(
        id: string,
        tagId: string
    ): Promise<
        paths['/v1/documents/{id}/tags/{tagId}']['delete']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/documents/${encodeURIComponent(
            id
        )}/tags/${encodeURIComponent(tagId)}`;
        const res = await this.fetcher(url, {
            method: 'DELETE',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'removeTagFromDocument');
        return (await res.json()) as paths['/v1/documents/{id}/tags/{tagId}']['delete']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/tags */
    async getTags(params?: {
        includeCount?: boolean;
        sortBy?: 'name' | 'createdAt' | 'documentCount';
        order?: 'asc' | 'desc';
    }): Promise<
        paths['/v1/tags']['get']['responses']['200']['content']['application/json']
    > {
        const queryParams = new URLSearchParams();
        if (params?.includeCount !== undefined) {
            queryParams.append('includeCount', params.includeCount.toString());
        }
        if (params?.sortBy) {
            queryParams.append('sortBy', params.sortBy);
        }
        if (params?.order) {
            queryParams.append('order', params.order);
        }
        const queryString = queryParams.toString();
        const url = `${this.baseUrl}/v1/tags${
            queryString ? `?${queryString}` : ''
        }`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'getTags');
        return (await res.json()) as paths['/v1/tags']['get']['responses']['200']['content']['application/json'];
    }

    /** POST /v1/tags */
    async createTag(
        body: paths['/v1/tags']['post']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/tags']['post']['responses']['201']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/tags`;
        const res = await this.fetcher(url, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...this.defaultHeaders,
            },
            body: JSON.stringify(body),
        });

        await this.ensureOk(res, 'createTag');
        return (await res.json()) as paths['/v1/tags']['post']['responses']['201']['content']['application/json'];
    }

    /** PATCH /v1/tags/{id} */
    async updateTag(
        id: string,
        body: paths['/v1/tags/{id}']['patch']['requestBody']['content']['application/json']
    ): Promise<
        paths['/v1/tags/{id}']['patch']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/tags/${encodeURIComponent(id)}`;
        const res = await this.fetcher(url, {
            method: 'PATCH',
            headers: {
                'content-type': 'application/json',
                ...this.defaultHeaders,
            },
            body: JSON.stringify(body),
        });

        await this.ensureOk(res, 'updateTag');
        return (await res.json()) as paths['/v1/tags/{id}']['patch']['responses']['200']['content']['application/json'];
    }

    /** DELETE /v1/tags/{id} */
    async deleteTag(id: string): Promise<void> {
        const url = `${this.baseUrl}/v1/tags/${encodeURIComponent(id)}`;
        const res = await this.fetcher(url, {
            method: 'DELETE',
            headers: this.defaultHeaders,
        });

        await this.ensureOk(res, 'deleteTag');
    }

    /** GET /v1/reminders/pending */
    async getPendingReminders(): Promise<
        paths['/v1/reminders/pending']['get']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/reminders/pending`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });
        await this.ensureOk(res, 'getPendingReminders');
        return (await res.json()) as paths['/v1/reminders/pending']['get']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/reminders/document/{documentId} */
    async getDocumentReminders(
        documentId: string
    ): Promise<
        paths['/v1/reminders/document/{documentId}']['get']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/reminders/document/${encodeURIComponent(
            documentId
        )}`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });
        await this.ensureOk(res, 'getDocumentReminders');
        return (await res.json()) as paths['/v1/reminders/document/{documentId}']['get']['responses']['200']['content']['application/json'];
    }

    /** PATCH /v1/reminders/{id}/dismiss */
    async dismissReminder(
        id: string
    ): Promise<
        paths['/v1/reminders/{id}/dismiss']['patch']['responses']['200']['content']['application/json']
    > {
        const url = `${this.baseUrl}/v1/reminders/${encodeURIComponent(
            id
        )}/dismiss`;
        const res = await this.fetcher(url, {
            method: 'PATCH',
            headers: this.defaultHeaders,
        });
        await this.ensureOk(res, 'dismissReminder');
        return (await res.json()) as paths['/v1/reminders/{id}/dismiss']['patch']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/search */
    async search(
        params: paths['/v1/search']['get']['parameters']['query']
    ): Promise<
        paths['/v1/search']['get']['responses']['200']['content']['application/json']
    > {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null) {
                return;
            }
            searchParams.append(key, String(value));
        });
        const qs = searchParams.toString();
        const url = `${this.baseUrl}/v1/search${qs ? `?${qs}` : ''}`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });
        await this.ensureOk(res, 'search');
        return (await res.json()) as paths['/v1/search']['get']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/admin/indexing */
    async getIndexingStatus(params?: {
        includeRecent?: boolean;
        includeRecentJobs?: boolean;
        jobLimit?: number;
    }): Promise<
        paths['/v1/admin/indexing']['get']['responses']['200']['content']['application/json']
    > {
        const searchParams = new URLSearchParams();
        if (params?.includeRecent !== undefined) {
            searchParams.append(
                'includeRecent',
                params.includeRecent.toString()
            );
        }
        if (params?.includeRecentJobs !== undefined) {
            searchParams.append(
                'includeRecentJobs',
                params.includeRecentJobs.toString()
            );
        }
        if (params?.jobLimit !== undefined) {
            searchParams.append('jobLimit', params.jobLimit.toString());
        }
        const qs = searchParams.toString();
        const url = `${this.baseUrl}/v1/admin/indexing${qs ? `?${qs}` : ''}`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });
        await this.ensureOk(res, 'getIndexingStatus');
        return (await res.json()) as paths['/v1/admin/indexing']['get']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/search-analytics/recent */
    async getRecentSearches(params?: {
        limit?: number;
    }): Promise<
        paths['/v1/search-analytics/recent']['get']['responses']['200']['content']['application/json']
    > {
        const searchParams = new URLSearchParams();
        if (params?.limit !== undefined) {
            searchParams.append('limit', params.limit.toString());
        }
        const qs = searchParams.toString();
        const url = `${this.baseUrl}/v1/search-analytics/recent${
            qs ? `?${qs}` : ''
        }`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });
        await this.ensureOk(res, 'getRecentSearches');
        return (await res.json()) as paths['/v1/search-analytics/recent']['get']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/search-analytics/top-queries */
    async getTopQueries(params?: {
        limit?: number;
        daysBack?: number;
    }): Promise<
        paths['/v1/search-analytics/top-queries']['get']['responses']['200']['content']['application/json']
    > {
        const searchParams = new URLSearchParams();
        if (params?.limit !== undefined) {
            searchParams.append('limit', params.limit.toString());
        }
        if (params?.daysBack !== undefined) {
            searchParams.append('daysBack', params.daysBack.toString());
        }
        const qs = searchParams.toString();
        const url = `${this.baseUrl}/v1/search-analytics/top-queries${
            qs ? `?${qs}` : ''
        }`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });
        await this.ensureOk(res, 'getTopQueries');
        return (await res.json()) as paths['/v1/search-analytics/top-queries']['get']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/search-analytics/metrics */
    async getSearchMetrics(params?: {
        startDate?: string | Date;
        endDate?: string | Date;
        includeComparison?: boolean;
    }): Promise<
        paths['/v1/search-analytics/metrics']['get']['responses']['200']['content']['application/json']
    > {
        const searchParams = new URLSearchParams();
        if (params?.startDate !== undefined) {
            const dateStr =
                params.startDate instanceof Date
                    ? params.startDate.toISOString()
                    : params.startDate;
            searchParams.append('startDate', dateStr);
        }
        if (params?.endDate !== undefined) {
            const dateStr =
                params.endDate instanceof Date
                    ? params.endDate.toISOString()
                    : params.endDate;
            searchParams.append('endDate', dateStr);
        }
        if (params?.includeComparison !== undefined) {
            searchParams.append(
                'includeComparison',
                params.includeComparison.toString()
            );
        }
        const qs = searchParams.toString();
        const url = `${this.baseUrl}/v1/search-analytics/metrics${
            qs ? `?${qs}` : ''
        }`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });
        await this.ensureOk(res, 'getSearchMetrics');
        return (await res.json()) as paths['/v1/search-analytics/metrics']['get']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/search-analytics/volume */
    async getSearchVolume(params: {
        startDate: string | Date;
        endDate: string | Date;
        granularity?: 'hour' | 'day';
    }): Promise<
        paths['/v1/search-analytics/volume']['get']['responses']['200']['content']['application/json']
    > {
        const searchParams = new URLSearchParams();
        const startDateStr =
            params.startDate instanceof Date
                ? params.startDate.toISOString()
                : params.startDate;
        searchParams.append('startDate', startDateStr);
        const endDateStr =
            params.endDate instanceof Date
                ? params.endDate.toISOString()
                : params.endDate;
        searchParams.append('endDate', endDateStr);
        if (params?.granularity !== undefined) {
            searchParams.append('granularity', params.granularity);
        }
        const qs = searchParams.toString();
        const url = `${this.baseUrl}/v1/search-analytics/volume${
            qs ? `?${qs}` : ''
        }`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });
        await this.ensureOk(res, 'getSearchVolume');
        return (await res.json()) as paths['/v1/search-analytics/volume']['get']['responses']['200']['content']['application/json'];
    }

    /** GET /v1/search-analytics/detail */
    async getDetailedSearchAnalytics(params?: {
        startDate?: string | Date;
        endDate?: string | Date;
        daysBack?: number;
        searchType?: 'lexical' | 'semantic' | 'hybrid';
        includeComparison?: boolean;
        includePerformance?: boolean;
        includeUserBehavior?: boolean;
        includeResponseTime?: boolean;
        topQueriesLimit?: number;
        topUsersLimit?: number;
    }): Promise<
        paths['/v1/search-analytics/detail']['get']['responses']['200']['content']['application/json']
    > {
        const searchParams = new URLSearchParams();
        if (params?.startDate !== undefined) {
            const dateStr =
                params.startDate instanceof Date
                    ? params.startDate.toISOString()
                    : params.startDate;
            searchParams.append('startDate', dateStr);
        }
        if (params?.endDate !== undefined) {
            const dateStr =
                params.endDate instanceof Date
                    ? params.endDate.toISOString()
                    : params.endDate;
            searchParams.append('endDate', dateStr);
        }
        if (params?.daysBack !== undefined) {
            searchParams.append('daysBack', params.daysBack.toString());
        }
        if (params?.searchType !== undefined) {
            searchParams.append('searchType', params.searchType);
        }
        if (params?.includeComparison !== undefined) {
            searchParams.append(
                'includeComparison',
                params.includeComparison.toString()
            );
        }
        if (params?.includePerformance !== undefined) {
            searchParams.append(
                'includePerformance',
                params.includePerformance.toString()
            );
        }
        if (params?.includeUserBehavior !== undefined) {
            searchParams.append(
                'includeUserBehavior',
                params.includeUserBehavior.toString()
            );
        }
        if (params?.includeResponseTime !== undefined) {
            searchParams.append(
                'includeResponseTime',
                params.includeResponseTime.toString()
            );
        }
        if (params?.topQueriesLimit !== undefined) {
            searchParams.append(
                'topQueriesLimit',
                params.topQueriesLimit.toString()
            );
        }
        if (params?.topUsersLimit !== undefined) {
            searchParams.append(
                'topUsersLimit',
                params.topUsersLimit.toString()
            );
        }
        const qs = searchParams.toString();
        const url = `${this.baseUrl}/v1/search-analytics/detail${
            qs ? `?${qs}` : ''
        }`;
        const res = await this.fetcher(url, {
            method: 'GET',
            headers: this.defaultHeaders,
        });
        await this.ensureOk(res, 'getDetailedSearchAnalytics');
        return (await res.json()) as paths['/v1/search-analytics/detail']['get']['responses']['200']['content']['application/json'];
    }
}

async function safeText(res: Response) {
    try {
        return await res.text();
    } catch {
        return undefined;
    }
}
