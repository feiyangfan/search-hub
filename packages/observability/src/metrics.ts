import client from 'prom-client';

// initialize default metrics collection
client.collectDefaultMetrics();

// Define custom metrics specific to my application
export const metrics = {
    // counter
    // How many authentication attempts (sign-in, sign-up)
    authAttempts: new client.Counter({
        name: 'auth_attempts_total',
        help: 'Total authentication attempts',
        labelNames: ['method', 'status'], // method: sign-in/sign-up, status: success/failure
    }),

    // How many users signed up
    userSignUps: new client.Counter({
        name: 'user_sign_ups_total',
        help: 'Total user sign ups',
        labelNames: ['source'], // web, mobile
    }),

    // How many times tenant is created
    tenantCreations: new client.Counter({
        name: 'tenant_creations_total',
        help: 'Total tenant creations',
    }),

    // How many api requests are made
    apiRequests: new client.Counter({
        name: 'api_requests_total',
        help: 'Total API requests',
        labelNames: ['tenant_id', 'endpoint', 'method', 'status_code'],
    }),

    // How many searches happen
    searchRequests: new client.Counter({
        name: 'search_requests_total',
        help: 'Total search requests',
        labelNames: ['tenant_id', 'search_type'], // hybrid, semantic, lexical
    }),

    // How many documents get created
    documentsCreated: new client.Counter({
        name: 'documents_created_total',
        help: 'Total documents created',
        labelNames: ['tenant_id', 'source_type'], // editor, link
    }),

    // How many db errors occur
    dbErrors: new client.Counter({
        name: 'db_errors_total',
        help: 'Total database errors',
        labelNames: ['tenant_id', 'operation'], // read, write, update, delete
    }),

    // How many background jobs run
    jobsProcessed: new client.Counter({
        name: 'jobs_processed_total',
        help: 'Total background jobs processed',
        labelNames: ['job_type', 'result'], // success, failure
    }),

    // How many failed background jobs
    jobsFailed: new client.Counter({
        name: 'jobs_failed_total',
        help: 'Total failed background jobs',
        labelNames: ['job_type', 'error_code'],
    }),

    // How long background jobs take to process
    jobDuration: new client.Histogram({
        name: 'job_duration_seconds',
        help: 'Background job processing duration in seconds',
        labelNames: ['job_type', 'tenant_id', 'result'], // result: success/failure
        buckets: [1, 5, 10, 30, 60, 120, 300], // 1s, 5s, 10s, 30s, 1m, 2m, 5m
    }),

    // gauge
    // How many users are online right now
    activeUsers: new client.Gauge({
        name: 'active_users',
        help: 'Currently active users',
        labelNames: ['tenant_id'],
    }),

    // How many jobs are waiting to be processed
    queueDepth: new client.Gauge({
        name: 'queue_depth',
        help: 'Current queue depth',
        labelNames: ['queue_name', 'tenant_id'],
    }),

    // Current active jobs being processed
    activeJobs: new client.Gauge({
        name: 'active_jobs',
        help: 'Current active jobs being processed',
        labelNames: ['job_type', 'tenant_id'],
    }),

    // Circuit breaker state (0=healthy, 1=failing)
    circuitBreakerState: new client.Gauge({
        name: 'circuit_breaker_state',
        help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
        labelNames: ['service'], // voyage_ai, database
    }),

    // histogram
    // How long API requests take
    apiRequestDuration: new client.Histogram({
        name: 'api_request_duration_seconds',
        help: 'API request duration in seconds',
        labelNames: ['tenant_id', 'endpoint', 'method', 'status_code'],
        buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5], // Time buckets: fast to slow
    }),

    // How long searches take (important for user experience)
    searchDuration: new client.Histogram({
        name: 'search_duration_seconds',
        help: 'Search request duration in seconds',
        labelNames: ['tenant_id', 'search_type', 'status'], // Added status: success/error
        buckets: [0.1, 0.5, 1, 2, 5, 10], // Time buckets: fast to slow
    }),

    // How long database queries take
    dbQueryDuration: new client.Histogram({
        name: 'db_query_duration_seconds',
        help: 'Database query duration',
        labelNames: ['operation', 'table'],
        buckets: [0.001, 0.01, 0.1, 0.5, 1, 2],
    }),

    // How long AI API calls take
    aiRequestDuration: new client.Histogram({
        name: 'ai_request_duration_seconds',
        help: 'AI service request duration',
        labelNames: ['provider', 'operation'], // voyage, embeddings/rerank
        buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    }),
};

// Export the Prometheus register for scraping
export const register = client.register;

export async function getMetrics(): Promise<string> {
    return await client.register.metrics();
}

/**
 * Reset all metrics (useful for testing/development)
 * WARNING: This should NEVER be exposed in production
 */
export function resetMetrics(): void {
    register.resetMetrics();
}
