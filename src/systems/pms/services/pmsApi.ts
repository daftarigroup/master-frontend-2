import { apiClient } from '@/lib/apiClient';

// Helper for PMS Indent & PO API endpoints. Goes through apiClient, so requests reach VITE_API_BASE_URL with the login token.
// Never throws: a failed call resolves to { success: false, error } (and GETs to an empty data list), which the views check.
async function call(method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: any) {
  try {
    const url = `/pms${path}`;
    const res: any =
      method === 'get' || method === 'delete' ? await apiClient[method](url) : await apiClient[method](url, body);
    return res;
  } catch (err: any) {
    console.warn(`pmsApi.${method}(${path}) error:`, err);
    return { success: false, ...(method === 'get' ? { data: [] } : {}), error: err?.message || 'Network error' };
  }
}

export const pmsApi = {
  get: (path: string) => call('get', path),
  post: (path: string, body: any) => call('post', path, body),
  patch: (path: string, body: any) => call('patch', path, body),
  delete: (path: string) => call('delete', path),
};

export default pmsApi;
