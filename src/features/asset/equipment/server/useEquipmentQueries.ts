import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { equipmentApi, type EquipmentQuery } from './equipmentApi';

export const useEquipmentList = (p: EquipmentQuery) =>
  useQuery({ queryKey: ['fleet', 'equipment', p], queryFn: () => equipmentApi.list(p), placeholderData: keepPreviousData, staleTime: 20_000 });

export const useEquipmentSummary = (id: string | null, month?: string) =>
  useQuery({ queryKey: ['fleet', 'equipment-summary', id, month], queryFn: () => equipmentApi.summary(id!, month), enabled: !!id, staleTime: 20_000 });
