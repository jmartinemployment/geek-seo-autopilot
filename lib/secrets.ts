import { readFileSync, existsSync } from 'fs';

export function getSecret(filename: string, envFallback: string): string {
  const secretPath = `/etc/secrets/${filename}`;
  if (existsSync(secretPath)) return readFileSync(secretPath, 'utf8').trim();
  return process.env[envFallback] || '';
}

// Cached at module level — read once, not on every request
const rawSecret = getSecret('jwt-secret-file', 'JWT_SECRET');
export const JWT_SECRET = new TextEncoder().encode(rawSecret);
