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

export const setRefreshTokenCookie = (res, token) => {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  const isProduction = process.env.NODE_ENV === 'production';
  // Allow plain-HTTP deployments (e.g. local docker compose) to opt out of
  // `Secure` cookies, otherwise the refresh token is silently dropped.
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : isProduction;

  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge,
    path: '/api/v1/auth'
  });
};

export const clearRefreshTokenCookie = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : isProduction;

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/api/v1/auth'
  });
};
