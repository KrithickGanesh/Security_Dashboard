/**
 * Cookie utilities for parsing and setting HTTP cookies without external libraries.
 */

export const parseCookies = (req) => {
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      acc[name] = decodeURIComponent(rest.join('='));
    }
    return acc;
  }, {});
};

const VALID_SAME_SITE = ['strict', 'lax', 'none'];

/**
 * Resolve cookie flags from the environment.
 *
 * - `COOKIE_SECURE` lets a plain-HTTP deployment (local docker compose) opt out
 *   of `Secure`, otherwise the refresh token is silently dropped.
 * - `COOKIE_SAME_SITE` is required when the SPA and the API live on different
 *   sites (e.g. Vercel + Render): browsers only send a cross-site cookie when
 *   it is `None; Secure`.
 */
const resolveCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  const configuredSameSite = (process.env.COOKIE_SAME_SITE || '').toLowerCase();
  const sameSite = VALID_SAME_SITE.includes(configuredSameSite)
    ? configuredSameSite
    : isProduction
      ? 'strict'
      : 'lax';

  // A `None` cookie is rejected by browsers unless it is also `Secure`.
  const secure =
    sameSite === 'none'
      ? true
      : process.env.COOKIE_SECURE !== undefined
        ? process.env.COOKIE_SECURE === 'true'
        : isProduction;

  return { httpOnly: true, secure, sameSite };
};

export const setRefreshTokenCookie = (res, token) => {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

  res.cookie('refreshToken', token, {
    ...resolveCookieOptions(),
    maxAge,
    path: '/api/v1/auth'
  });
};

export const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    ...resolveCookieOptions(),
    path: '/api/v1/auth'
  });
};
