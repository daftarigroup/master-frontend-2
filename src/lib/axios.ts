import axios from 'axios';
import { getApiBaseUrl } from '@/lib/utils';

/**
 * Real API client for HR and shared modules.
 * Connects directly to master-backend, attaching auth tokens automatically.
 */
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('checklistToken');
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Graceful handling for prototype sub-endpoints that do not exist yet on backend: return empty array rather than unhandled rejection
    if (error.response?.status === 404 && error.config?.url?.includes('/hrfms/')) {
      return Promise.resolve({
        data: {
          success: true,
          data: [],
          message: 'Endpoint not yet implemented on backend',
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
      });
    }
    return Promise.reject(error);
  }
);

export default api;
