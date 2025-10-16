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
    async deleteTenant() {
        const url = `${this.baseUrl}/v1/tenants`;
        const res = await this.fetcher(url, {
            method: 'delete',
            headers: {
                ...this.defaultHeaders,
            },
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
}

async function safeText(res: Response) {
    try {
        return await res.text();
    } catch {
        return undefined;
    }
}
