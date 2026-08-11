import axios from 'axios';
import { getApiBaseUrl } from '@/lib/utils';

export const CHECKLIST_TOKEN_KEY = 'checklistToken';

/**
 * Dedicated axios instance for the new `/checklist/*` module routes.
 */
export const checklistApiClient = axios.create({
  baseURL: `${getApiBaseUrl()}/checklist`,
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
