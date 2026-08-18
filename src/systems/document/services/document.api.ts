import { documentApiClient } from '@/lib/documentApiClient';

export const documentsApi = {
  list: (params?: any) => documentApiClient.get('/documents', { params }),
  getOne: (id: string) => documentApiClient.get(`/documents/${id}`),
  create: (data: any) => documentApiClient.post('/documents', data),
  update: (id: string, data: any) => documentApiClient.put(`/documents/${id}`, data),
  remove: (id: string) => documentApiClient.delete(`/documents/${id}`),
  listRenewals: (documentId?: string) =>
    documentId
      ? documentApiClient.get(`/documents/${documentId}/renewals`)
      : documentApiClient.get('/documents/renewals'),
  recordRenewal: (id: string, data: any) =>
    documentApiClient.post(`/documents/${id}/renewals`, data),
  listShares: (docSerial?: string) =>
    docSerial
      ? documentApiClient.get(`/documents/shares/${docSerial}`)
      : documentApiClient.get('/documents/shares'),
  recordShare: (id: string, data: any) =>
    documentApiClient.post(`/documents/${id}/share`, data),
};

export const subscriptionsApi = {
  list: (params?: any) => documentApiClient.get('/subscriptions', { params }),
  getOne: (id: string) => documentApiClient.get(`/subscriptions/${id}`),
  create: (data: any) => documentApiClient.post('/subscriptions', data),
  update: (id: string, data: any) => documentApiClient.put(`/subscriptions/${id}`, data),
  remove: (id: string) => documentApiClient.delete(`/subscriptions/${id}`),
  approve: (id: string, data: any) => documentApiClient.put(`/subscriptions/${id}/approval`, data),
  pay: (id: string, data: any) => documentApiClient.put(`/subscriptions/${id}/payment`, data),
  listRenewals: (subscriptionId?: string) =>
    subscriptionId
      ? documentApiClient.get(`/subscriptions/${subscriptionId}/renewals`)
      : documentApiClient.get('/subscriptions/renewals'),
  recordRenewal: (id: string, data: any) =>
    documentApiClient.post(`/subscriptions/${id}/renewals`, data),
};

export const loansApi = {
  list: (params?: any) => documentApiClient.get('/loans', { params }),
  getOne: (id: string) => documentApiClient.get(`/loans/${id}`),
  create: (data: any) => documentApiClient.post('/loans', data),
  update: (id: string, data: any) => documentApiClient.put(`/loans/${id}`, data),
  remove: (id: string) => documentApiClient.delete(`/loans/${id}`),
  foreclosureRequest: (id: string, data: any) =>
    documentApiClient.put(`/loans/${id}/foreclosure`, data),
  collectDocuments: (id: string, data: any) =>
    documentApiClient.put(`/loans/${id}/documents`, data),
  collectNoc: (id: string) => documentApiClient.put(`/loans/${id}/noc`, {}),
  settle: (id: string, data: any) => documentApiClient.put(`/loans/${id}/settlement`, data),
};
