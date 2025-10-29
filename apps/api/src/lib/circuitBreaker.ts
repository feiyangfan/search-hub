import { metrics } from '@search-hub/observability';

export interface CircuitBreakerOptions {
    /** Number of consecutive failures allowed before the breaker opens */
    failureThreshold: number;
    /** How long to wait after opening before letting a single trial request through */
    halfOpenTimeoutMs: number;
    /** Minimum time the breaker stays open before transitioning toward recovery */
    resetTimeoutMs: number;
    /** Service name for metrics (e.g., 'voyage_ai', 'database') */
    serviceName?: string;
}

// closed: healthy
// open: all requests fail
// half-open: let one request through, if success -> closed, else -> open
type State = 'closed' | 'open' | 'half-open';

// A simple circuit breaker implementation
export class CircuitBreaker {
    private state: State = 'closed';
    private failures = 0;
    private openUntil = 0;
    private halfOpenReadyAt = 0;
    private halfOpenProbeInFlight = false;
    private readonly serviceName: string;

    constructor(private readonly opts: CircuitBreakerOptions) {
        this.serviceName = opts.serviceName || 'unknown';
        // Initialize circuit breaker state metric (0 = closed)
        metrics.circuitBreakerState.set({ service: this.serviceName }, 0);
    }

    // canExecute returns true if a request is allowed to proceed
    canExecute(now = Date.now()) {
        // if open, check if we can try again
        if (this.state === 'open') {
            const readyAt = Math.max(this.openUntil, this.halfOpenReadyAt);
            if (now < readyAt) {
                return false;
            }

            // move to half-open to let one request through
            this.state = 'half-open';
            metrics.circuitBreakerState.set({ service: this.serviceName }, 2);
            this.halfOpenProbeInFlight = false;
        }

        // if half-open, only let one request through
        if (this.state === 'half-open') {
            if (this.halfOpenProbeInFlight) {
                return false;
            }

            // mark that probe is in flight
            this.halfOpenProbeInFlight = true;
        }

        return true;
    }

    // recordSuccess resets the breaker to closed state
    recordSuccess() {
        this.state = 'closed';
        metrics.circuitBreakerState.set({ service: this.serviceName }, 0);
        this.failures = 0;
        this.openUntil = 0;
        this.halfOpenReadyAt = 0;
        this.halfOpenProbeInFlight = false;
    }

    // recordFailure increments the failure count and opens the breaker if threshold is reached
    recordFailure(now = Date.now()) {
        this.failures += 1;
        // if failure threshold is reached, open the breaker
        if (
            this.state === 'half-open' ||
            this.failures >= this.opts.failureThreshold
        ) {
            this.state = 'open';
            metrics.circuitBreakerState.set({ service: this.serviceName }, 1);
            this.failures = 0;
            this.halfOpenProbeInFlight = false;
            this.openUntil = now + this.opts.resetTimeoutMs;
            this.halfOpenReadyAt = now + this.opts.halfOpenTimeoutMs;
        }
    }

    // Exposes the current breaker state for logging/observability.
    currentState() {
        return this.state;
    }
}
