import crypto from 'node:crypto';
export const sha256 = (s: string) =>
    crypto.createHash('sha256').update(s).digest('hex');
