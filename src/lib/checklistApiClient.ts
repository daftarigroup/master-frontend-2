import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_PUBLIC_API_URL ||
  'http://localhost:5001/api';

export const CHECKLIST_TOKEN_KEY = 'checklistToken';

/**
 * Dedicated axios instance for the new `/checklist/*` module routes.
 *
 * Unlike the rest of the app (which has zero backend auth enforcement),
 * this module's backend actually validates a JWT. The token is minted at
 * login (`POST /store/users/authenticate` now also returns a top-level
 * `checklistToken`) and persisted to localStorage; this client re-reads it
 * fresh on every request via the interceptor below so it stays valid
 * immediately after login and is cleared immediately after logout.
 */
export const checklistApiClient = axios.create({
  baseURL: `${API_BASE_URL}/checklist`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

checklistApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(CHECKLIST_TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    if (config.headers) {
      delete (config.headers as any)['Content-Type'];
      delete (config.headers as any)['content-type'];
    }
  }

  return config;
});

checklistApiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Checklist API request failed';
    return Promise.reject(new Error(message));
  }
);
