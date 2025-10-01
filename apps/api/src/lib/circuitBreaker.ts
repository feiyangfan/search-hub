import { setTimeout as sleep } from 'node:timers/promises';

export type CircuitBreakerOptions = {
    /** Number of consecutive failures allowed before the breaker opens */
    failureThreshold: number;
    /** How long to wait after opening before letting a single trial request through */
    halfOpenTimeoutMs: number;
    /** Minimum time the breaker stays open before transitioning toward recovery */
    resetTimeoutMs: number;
};

type State = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
    private state: State = 'closed';
    private failures = 0;
    private lastOpenedAt = 0;

    constructor(private readonly opts: CircuitBreakerOptions) {}

    /**
     * Returns true when the protected operation should run.
     * - Closed: calls are allowed.
     * - Open: calls are blocked until the reset timeout expires.
     * - Half-open: a single trial call is allowed; further calls wait for the result.
     */
    canExecute(now = Date.now()) {
        if (
            this.state === 'open' &&
            now - this.lastOpenedAt >= this.opts.resetTimeoutMs
        ) {
            // Enough time has passed—allow exactly one trial request.
            this.state = 'half-open';
            this.failures = 0;
            return true;
        }
        return this.state !== 'open';
    }

    /**
     * Resets the breaker back to its healthy (closed) state after a successful call.
     */
    recordSuccess() {
        this.state = 'closed';
        this.failures = 0;
    }

    /**
     * Records a failure. If the threshold is reached—or we’re already in half-open—
     * flip to open, wait out the cool-down, and then transition to half-open so
     * the next caller can probe for recovery.
     */
    async recordFailure(now = Date.now()) {
        this.failures += 1;
        if (
            this.state === 'half-open' ||
            this.failures >= this.opts.failureThreshold
        ) {
            this.state = 'open';
            this.lastOpenedAt = now;

            // Optional: give the downstream a moment before allowing the half-open probe.
            await sleep(this.opts.halfOpenTimeoutMs);

            this.state = 'half-open';
            this.failures = 0;
        }
    }

    /**
     * Exposes the current breaker state for logging/observability.
     */
    currentState() {
        return this.state;
    }
}
