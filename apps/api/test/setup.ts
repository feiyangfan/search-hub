import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

process.env.NODE_ENV = 'test';
process.env.BASE_URL = 'http://localhost:3000';
process.env.PORT = '3000';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
process.env.LOG_LEVEL = 'debug';
process.env.REDIS_URL = 'redis://localhost:6379/0';
process.env.API_RATE_LIMIT_WINDOW_MS = '60000';
process.env.API_RATE_LIMIT_MAX = '100';
process.env.API_BREAKER_FAILURE_THRESHOLD = '5';
process.env.API_BREAKER_RESET_TIMEOUT_MS = '1000';
process.env.API_BREAKER_HALF_OPEN_TIMEOUT_MS = '1000';

process.env.VOYAGE_API_KEY = 'testkey';

const testDir = dirname(fileURLToPath(import.meta.url));
process.chdir(resolve(testDir, '..'));
