/**
 * Read an environment variable when the request is served, not when the app
 * is built. Next.js inlines `process.env.NEXT_PUBLIC_*` at build time; a
 * dynamic lookup keeps `docker run -e NEXT_PUBLIC_DOMAIN=…` working.
 */
export const runtimeEnv = (name: string): string | undefined => process.env[name] || undefined;

/** The album's public origin, e.g. `https://love.example.com`, if configured. */
export function configuredOrigin(): string | undefined {
  const domain = runtimeEnv('NEXT_PUBLIC_DOMAIN') ?? runtimeEnv('VERCEL_PROJECT_PRODUCTION_URL');
  if (!domain) return undefined;
  return (domain.startsWith('http') ? domain : `https://${domain}`).replace(/\/+$/, '');
}

/** Postgres connection string. Vercel's Neon integration provides both names. */
export const databaseUrl = (): string | undefined =>
  process.env.POSTGRES_URL || process.env.DATABASE_URL || undefined;

/** On Vercel the filesystem is read-only and reset on every deploy. */
export const onVercel = () => Boolean(process.env.VERCEL);
