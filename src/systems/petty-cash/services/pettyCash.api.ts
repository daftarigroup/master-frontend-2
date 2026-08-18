import { pettyCashApiClient } from '@/lib/pettyCashApiClient';

export const creditsApi = {
  list: (params?: any) => pettyCashApiClient.get('/credits', { params }),
  getById: (id: string) => pettyCashApiClient.get(`/credits/${id}`),
  create: (body: any) => pettyCashApiClient.post('/credits', body),
  update: (id: string, body: any) => pettyCashApiClient.put(`/credits/${id}`, body),
};

export const expensesApi = {
  list: (params?: any) => pettyCashApiClient.get('/expenses', { params }),
  getById: (id: string) => pettyCashApiClient.get(`/expenses/${id}`),
  create: (body: any) => pettyCashApiClient.post('/expenses', body),
  update: (id: string, body: any) => pettyCashApiClient.put(`/expenses/${id}`, body),
  updateStatus: (id: string, status: 'APPROVED' | 'REJECTED') =>
    pettyCashApiClient.put(`/expenses/${id}/status`, { status }),
};

export const ledgerApi = {
  list: (params?: any) => pettyCashApiClient.get('/ledger', { params }),
  getBalance: (personName: string) => pettyCashApiClient.get(`/ledger/balance/${encodeURIComponent(personName)}`),
};

export const mastersApi = {
  list: (type?: string) => pettyCashApiClient.get('/project-master', { params: type ? { type } : {} }),
  getById: (id: string) => pettyCashApiClient.get(`/project-master/${id}`),
  create: (body: any) => pettyCashApiClient.post('/project-master', body),
  update: (id: string, body: any) => pettyCashApiClient.put(`/project-master/${id}`, body),
  delete: (id: string) => pettyCashApiClient.delete(`/project-master/${id}`),
};

export const settingsApi = {
  get: () => pettyCashApiClient.get('/settings'),
  update: (body: any) => pettyCashApiClient.put('/settings', body),
  addPaymentMode: (name: string) => pettyCashApiClient.post('/settings/payment-modes', { name }),
  removePaymentMode: (name: string) => pettyCashApiClient.delete(`/settings/payment-modes/${encodeURIComponent(name)}`),
};

export const dashboardApi = {
  getSummary: () => pettyCashApiClient.get('/dashboard/summary'),
};
