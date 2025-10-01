import { setTimeout as sleep } from 'node:timers/promises';

export type CircuitBreakerOptions = {
    /** Number of consecutive failures allowed before the breaker opens */
    failureThreshold: number;
    /** How long to wait after opening before letting a single trial request through */
    halfOpenTimeoutMs: number;
    /** Minimum time the breaker stays open before transitioning toward recovery */
    resetTimeoutMs: number;
};

// closed: healthy
// open: all requests fail
// half-open: let one request through, if success -> closed, else -> open
type State = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
    private state: State = 'closed';
    private failures = 0;
    private nextProbeAt = 0;
    private halfOpenProbeInFlight = false;

    constructor(private readonly opts: CircuitBreakerOptions) {}

    // canExecute returns true if a request is allowed to proceed
    canExecute(now = Date.now()) {
        // if open, check if we can try again
        if (this.state === 'open') {
            if (now < this.nextProbeAt) {
                return false;
            }

            // move to half-open to let one request through
            this.state = 'half-open';
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

    recordSuccess() {
        this.state = 'closed';
        this.failures = 0;
        this.halfOpenProbeInFlight = false;
    }

    recordFailure(now = Date.now()) {
        this.failures += 1;
        if (
            this.state === 'half-open' ||
            this.failures >= this.opts.failureThreshold
        ) {
            this.state = 'open';
            this.failures = 0;
            this.halfOpenProbeInFlight = false;
            this.nextProbeAt = now + this.opts.resetTimeoutMs;
        }
    }

    /**
     * Exposes the current breaker state for logging/observability.
     */
    currentState() {
        return this.state;
    }
}
