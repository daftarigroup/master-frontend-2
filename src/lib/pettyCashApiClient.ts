import axios from 'axios';
import { getApiBaseUrl } from '@/lib/utils';

export const pettyCashApiClient = axios.create({
  baseURL: `${getApiBaseUrl()}/petty-cash`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

pettyCashApiClient.interceptors.request.use((config) => {
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

pettyCashApiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Petty Cash API request failed';
    return Promise.reject(new Error(message));
  }
);
