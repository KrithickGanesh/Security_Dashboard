/**
 * Single source of truth for allowed browser origins.
 *
 * CLIENT_URL accepts a comma-separated list so that a deployment can allow
 * several frontends (e.g. a custom domain plus a preview URL).
 *
 * RENDER_EXTERNAL_URL is injected automatically by Render with the service's
 * public URL. Including it means a single-service deployment keeps working
 * even when CLIENT_URL is stale or missing.
 */

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const normalise = (origin) => origin.trim().replace(/\/+$/, '');

export const getAllowedOrigins = () => {
  const configured = (process.env.CLIENT_URL || '')
    .split(',')
    .map(normalise)
    .filter(Boolean);

  const platform = [process.env.RENDER_EXTERNAL_URL]
    .filter(Boolean)
    .map(normalise);

  return [...new Set([...configured, ...platform, ...DEFAULT_ORIGINS])];
};

export const isOriginAllowed = (origin) => {
  // Requests without an Origin header (curl, Postman, server-to-server) are allowed.
  if (!origin) return true;
  return getAllowedOrigins().includes(normalise(origin));
};

export default { getAllowedOrigins, isOriginAllowed };
