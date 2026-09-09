import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '@/store/hook';
import { selectOrgViewMode } from '@/store/slice/userAccountData';
import type {
  CreateTemplatePayload,
  SaveFieldValuesPayload,
  UpdateTemplatePayload,
} from '../../types/types';
import {
  createTemplate,
  deleteTemplate,
  fetchFieldValues,
  fetchTemplateById,
  fetchTemplates,
  renderLetter,
  saveFieldValues,
  updateTemplate,
} from '../api/letterFormatterApi';

const KEYS = {
  all: ['hr', 'letter-templates'] as const,
  one: (id: number) => ['hr', 'letter-templates', id] as const,
  fieldValues: (id: number, empId?: string) =>
    ['hr', 'letter-templates', id, 'field-values', empId ?? ''] as const,
  render: (id: number, empId: string) => ['hr', 'letter-templates', id, 'render', empId] as const,
};

export const useLetterTemplates = () => {
  const orgViewMode = useAppSelector(selectOrgViewMode);
  return useQuery({
    queryKey: [...KEYS.all, orgViewMode],
    queryFn: fetchTemplates,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useLetterTemplate = (id: number, actAsTenantId?: string) =>
  useQuery({
    queryKey: [...KEYS.one(id), actAsTenantId ?? ''],
    queryFn: () => fetchTemplateById(id, actAsTenantId),
    enabled: id > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useFieldValues = (templateId: number, employeeId?: string, actAsTenantId?: string) =>
  useQuery({
    queryKey: [...KEYS.fieldValues(templateId, employeeId), actAsTenantId ?? ''],
    queryFn: () => fetchFieldValues(templateId, employeeId, actAsTenantId),
    enabled: templateId > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 4 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useRenderedLetter = (templateId: number, employeeId: string, actAsTenantId?: string) =>
  useQuery({
    queryKey: [...KEYS.render(templateId, employeeId), actAsTenantId ?? ''],
    queryFn: () => renderLetter(templateId, employeeId, actAsTenantId),
    enabled: templateId > 0 && employeeId.length > 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => createTemplate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
};

export const useUpdateTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
      actAsTenantId,
    }: {
      id: number;
      payload: UpdateTemplatePayload;
      actAsTenantId?: string;
    }) => updateTemplate(id, payload, actAsTenantId),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.one(id) });
    },
  });
};

export const useDeleteTemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, actAsTenantId }: { id: number; actAsTenantId?: string }) =>
      deleteTemplate(id, actAsTenantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
};

export const useSaveFieldValues = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      payload,
      actAsTenantId,
    }: {
      templateId: number;
      payload: SaveFieldValuesPayload;
      actAsTenantId?: string;
    }) => saveFieldValues(templateId, payload, actAsTenantId),
    onSuccess: (_data, { templateId }) => {
      qc.invalidateQueries({
        queryKey: ['hr', 'letter-templates', templateId, 'field-values'],
      });
    },
  });
};
