import axios from 'axios';

/**
 * In development the SPA talks to the API through the Vite proxy, so a
 * relative base URL is correct. In production the frontend may be hosted on a
 * different origin (e.g. Vercel) from the API (e.g. Render), so the absolute
 * URL is injected at build time via VITE_API_URL.
 */
const API_ROOT = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api/v1`;

let accessToken = localStorage.getItem('dso_token') || null;

const SESSION_HINT_KEY = 'dso_has_session';

export const setStoredAccessToken = (token) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('dso_token', token);
    localStorage.setItem(SESSION_HINT_KEY, '1');
  } else {
    localStorage.removeItem('dso_token');
    localStorage.removeItem(SESSION_HINT_KEY);
  }
};

export const getStoredAccessToken = () => accessToken;

/**
 * True when the browser may still hold a valid refresh-token cookie.
 * Used to avoid firing a guaranteed 401 on public pages.
 */
export const hasSessionHint = () => localStorage.getItem(SESSION_HINT_KEY) === '1';
export const clearSessionHint = () => localStorage.removeItem(SESSION_HINT_KEY);

const api = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach Bearer Token
api.interceptors.request.use(
  (config) => {
    if (accessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Silent Refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints to prevent loops
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/forgot-password') ||
      originalRequest.url?.includes('/auth/reset-password')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_ROOT}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.data.accessToken;
        setStoredAccessToken(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        setStoredAccessToken(null);

        // Only bounce the user to login from a protected page.
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
        const onPublicPage = publicPaths.some((path) =>
          window.location.pathname.startsWith(path)
        );

        if (!onPublicPage) {
          window.location.href = `/login?sessionExpired=true&redirect=${encodeURIComponent(
            window.location.pathname
          )}`;
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
