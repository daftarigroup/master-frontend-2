import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateDocBody, FileRef, RegisterQuery, UpdateDocBody } from '../types';
import { documentsApi } from './documentsApi';

export const DOCS = ['asset', 'documents'] as const;

export const useMachineDocuments = (machineId: string | undefined) =>
  useQuery({ queryKey: [...DOCS, 'machine', machineId], queryFn: () => documentsApi.forMachine(machineId!), enabled: !!machineId, staleTime: 20_000 });

export const useDocumentRegister = (p: RegisterQuery) =>
  useQuery({ queryKey: [...DOCS, 'register', p], queryFn: () => documentsApi.register(p), placeholderData: keepPreviousData, staleTime: 20_000 });

/** The one source of the sidebar badge, dashboard alert and Equipment Master chips: the same numbers as the register tiles. */
export const useDocumentCounts = (p: { firmId?: string; perMachine?: boolean } = {}, enabled = true) =>
  useQuery({ queryKey: [...DOCS, 'counts', p], queryFn: () => documentsApi.counts(p), enabled, staleTime: 60_000, retry: false });

export const useDocumentTypes = (machineId: string | undefined, enabled = true) =>
  useQuery({ queryKey: [...DOCS, 'types', machineId ?? 'all'], queryFn: () => documentsApi.types(machineId), enabled, staleTime: 5 * 60_000 });

export const useDocumentDetail = (id: string | undefined) =>
  useQuery({ queryKey: [...DOCS, 'detail', id], queryFn: () => documentsApi.detail(id!), enabled: !!id, staleTime: 10_000 });

/** Any change refreshes every number on every documents screen at once. */
function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: DOCS });
}

export const useCreateDocument = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (b: CreateDocBody) => documentsApi.create(b), onSuccess: refresh });
};
export const useUpdateDocument = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (v: { id: string; body: UpdateDocBody }) => documentsApi.update(v.id, v.body), onSuccess: refresh });
};
export const useChangeDocumentFiles = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (v: { id: string; mode: 'replace' | 'add'; files: FileRef[] }) => documentsApi.changeFiles(v.id, { mode: v.mode, files: v.files }), onSuccess: refresh });
};
export const useVoidDocument = () => {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (v: { id: string; reason: string }) => documentsApi.void(v.id, v.reason), onSuccess: refresh });
};
