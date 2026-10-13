import { api } from '@/lib/axios';
import type { CreateDocBody, DocCounts, DocTypeOption, DocumentDetail, FileRef, MachineDocs, PresignedFile, RegisterList, RegisterQuery, UpdateDocBody } from '../types';

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;
/** Empty filter values are left out so the server sees only what the user chose. */
const clean = (p: object) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export interface PresignBody {
  machineId?: string;
  ownerUserId?: string;
  firmId?: string;
  documentTypeId: string;
  purpose?: 'work_order';
  files: Array<{ name: string; mimeType: string; sizeBytes: number }>;
}

export const documentsApi = {
  forMachine: (machineId: string) => api.get(`/fleet/documents/machine/${machineId}`).then((r) => unwrap<MachineDocs>(r)),
  register: (p: RegisterQuery) => api.get('/fleet/documents', { params: clean(p) }).then((r) => unwrap<RegisterList>(r)),
  counts: (p: { firmId?: string; perMachine?: boolean }) => api.get('/fleet/documents/counts', { params: clean(p) }).then((r) => unwrap<DocCounts>(r)),
  types: (machineId?: string) => api.get('/fleet/documents/types', { params: clean({ machineId }) }).then((r) => unwrap<DocTypeOption[]>(r)),
  detail: (id: string) => api.get(`/fleet/documents/${id}`).then((r) => unwrap<DocumentDetail>(r)),

  presign: (body: PresignBody) => api.post('/fleet/documents/presign', body).then((r) => unwrap<PresignedFile[]>(r)),
  create: (body: CreateDocBody) => api.post('/fleet/documents', body).then((r) => unwrap<{ id: string; idempotent: boolean }>(r)),
  update: (id: string, body: UpdateDocBody) => api.patch(`/fleet/documents/${id}`, body).then((r) => unwrap<{ id: string; changed: string[] }>(r)),
  changeFiles: (id: string, body: { mode: 'replace' | 'add'; files: FileRef[] }) => api.post(`/fleet/documents/${id}/files`, body).then((r) => unwrap<{ id: string }>(r)),
  void: (id: string, reason: string) => api.post(`/fleet/documents/${id}/void`, { reason }).then((r) => unwrap<{ id: string; voided: boolean }>(r)),
  download: (fileId: string, inline: boolean) => api.get(`/fleet/documents/files/${fileId}/download`, { params: inline ? { inline: true } : {} }).then((r) => unwrap<{ url: string; filename: string }>(r)),
  exportCsv: (p: RegisterQuery) => api.get('/fleet/documents/export', { params: clean({ ...p, view: undefined, page: undefined, limit: undefined }), responseType: 'blob' }).then((r) => r.data as Blob),
};
