import { actAsTenantHeaders } from '@/features/organization/utils/actAsTenant';
import { api } from '@/lib/axios';
import type {
  CreateTemplatePayload,
  HrLetterFieldValue,
  HrLetterTemplate,
  RenderedLetter,
  SaveFieldValuesPayload,
  UpdateTemplatePayload,
} from '../../types/types';

export const fetchTemplates = async (): Promise<HrLetterTemplate[]> => {
  const res = await api.get('/hrfms/letter-template');
  return res.data.data;
};

export const fetchTemplateById = async (
  id: number,
  actAsTenantId?: string
): Promise<HrLetterTemplate> => {
  const res = await api.get(`/hrfms/letter-template/${id}`, actAsTenantHeaders(actAsTenantId));
  return res.data.data;
};

export const createTemplate = async (payload: CreateTemplatePayload): Promise<HrLetterTemplate> => {
  const res = await api.post('/hrfms/letter-template', payload);
  return res.data.data;
};

export const updateTemplate = async (
  id: number,
  payload: UpdateTemplatePayload,
  actAsTenantId?: string
): Promise<HrLetterTemplate> => {
  const res = await api.patch(
    `/hrfms/letter-template/${id}`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const deleteTemplate = async (id: number, actAsTenantId?: string): Promise<void> => {
  await api.delete(`/hrfms/letter-template/${id}`, actAsTenantHeaders(actAsTenantId));
};

export const fetchFieldValues = async (
  templateId: number,
  employeeId?: string,
  actAsTenantId?: string
): Promise<HrLetterFieldValue[]> => {
  const params = employeeId ? { employeeId } : {};
  const res = await api.get(`/hrfms/letter-template/${templateId}/field-values`, {
    params,
    ...actAsTenantHeaders(actAsTenantId),
  });
  return res.data.data;
};

export const saveFieldValues = async (
  templateId: number,
  payload: SaveFieldValuesPayload,
  actAsTenantId?: string
): Promise<HrLetterFieldValue[]> => {
  const res = await api.post(
    `/hrfms/letter-template/${templateId}/field-values`,
    payload,
    actAsTenantHeaders(actAsTenantId)
  );
  return res.data.data;
};

export const renderLetter = async (
  templateId: number,
  employeeId: string,
  actAsTenantId?: string
): Promise<RenderedLetter> => {
  const res = await api.get(`/hrfms/letter-template/${templateId}/render`, {
    params: { employeeId },
    ...actAsTenantHeaders(actAsTenantId),
  });
  const data = res.data.data;
  return {
    ...data,
    html: data.html || data.renderedHtml || '',
    employeeName:
      data.employeeName ||
      data.tokensReplaced?.employeeName ||
      data.tokensReplaced?.name ||
      data.tokensReplaced?.candidateName ||
      '',
  };
};
