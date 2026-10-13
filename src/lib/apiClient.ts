import axios from 'axios';
import { getApiBaseUrl } from '@/lib/utils';

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const AUTH_REJECTED_EVENT = 'auth:rejected';

// Public calls that must never carry a (possibly stale) token.
const NO_TOKEN_PATHS = ['/store/users/authenticate'];

// The backend answers 403 to an expired token, so an expired one is never attached.
function isTokenFresh(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// Request interceptor: attach the login token, and remove the default Content-Type header for FormData
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('checklistToken');
  if (token && isTokenFresh(token) && !NO_TOKEN_PATHS.some((p) => (config.url || '').includes(p))) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  }
  return config;
});

// Response interceptor to unwrap data and format errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'API Request failed';
    const err: Error & { status?: number } = new Error(message);
    err.status = error.response?.status;
    // 401 = login required, 403 on a token = expired / invalid: tell the app to sign out (AuthContext listens).
    const rejectedToken = err.status === 403 && /invalid or expired token/i.test(message);
    if (err.status === 401 || rejectedToken) {
      window.dispatchEvent(new Event(AUTH_REJECTED_EVENT));
    }
    return Promise.reject(err);
  }
);

// Store API Helper Utilities
export const storeApi = {
  async fetch(table: string, params?: Record<string, any>) {
    const res: any = await apiClient.get(`/store/entity/${table}`, { params });
    return res.data || [];
  },

  async fetchAll(table: string, params?: Record<string, any>) {
    const res: any = await apiClient.get(`/store/entity/${table}`, { params: { limit: 'all', ...params } });
    return res.data || [];
  },

  async fetchWithPagination(table: string, params?: Record<string, any>) {
    const res: any = await apiClient.get(`/store/entity/${table}`, { params });
    return {
      data: res.data || [],
      hasMore: !!res.hasMore,
      nextCursor: res.nextCursor || null,
    };
  },

  async fetchById(table: string, id: string | number) {
    const res: any = await apiClient.get(`/store/entity/${table}/${id}`);
    return res.data;
  },

  async insert(table: string, data: any) {
    const res: any = await apiClient.post(`/store/entity/${table}`, data);
    return res.data;
  },

  async update(table: string, id: string | number, data: any) {
    const res: any = await apiClient.patch(`/store/entity/${table}/${id}`, data);
    return res.data;
  },

  async updateWhere(table: string, where: Record<string, any>, data: any) {
    const res: any = await apiClient.patch(`/store/entity/${table}`, { where, data });
    return res.data;
  },

  async delete(table: string, id: string | number) {
    const res: any = await apiClient.delete(`/store/entity/${table}/${id}`);
    return res.data;
  },
};

// Email API Helper Utilities via Resend
export const emailApi = {
  async sendEmail(payload: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: any[];
  }) {
    const res: any = await apiClient.post('/email/send', payload);
    return res;
  },
};
