import axios from 'axios';
import Cookies from 'js-cookie';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
});

// Attach the access token to every request if we have one
api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If a request fails with 401 (access token expired — they only last 15 minutes),
// try once to silently refresh it using the longer-lived refresh token, then
// retry the original request. Only log the user out if the refresh itself fails.
let isRefreshing = false;
let pendingRequests: (() => void)[] = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = Cookies.get('refreshToken');
      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another request already triggered a refresh — wait for it instead of
        // firing a second refresh call, then retry this request.
        return new Promise((resolve) => {
          pendingRequests.push(() => resolve(api(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        const res = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken },
        );
        saveAuth(res.data);
        pendingRequests.forEach((cb) => cb());
        pendingRequests = [];
        return api(originalRequest);
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export function saveAuth(data: { accessToken: string; refreshToken: string; user: any }) {
  Cookies.set('accessToken', data.accessToken, { expires: 1 });
  Cookies.set('refreshToken', data.refreshToken, { expires: 7 });
  Cookies.set('user', JSON.stringify(data.user), { expires: 7 });
}

export function getCurrentUser() {
  const raw = Cookies.get('user');
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  Cookies.remove('user');
}
