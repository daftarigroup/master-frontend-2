import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { filterByFirmAccess } from '@/lib/firmAccess';

export interface CompanyOption {
  id: string;
  name: string;
}

export interface CompanySelectFieldProps {
  onSelect?: (company: CompanyOption) => void;
  value?: string;
  defaultValue?: string;
  className?: string;
  disabled?: boolean;
}

export function CompanySelectField({
  onSelect,
  value,
  defaultValue,
  className,
  disabled,
}: CompanySelectFieldProps) {
  const { user } = useAuth();
  const { selectedProject } = useProject();

  const { data: firmsResponse, isLoading } = useQuery({
    queryKey: ['maintenance', 'firms', 'list'],
    queryFn: async () => {
      const res = await api.get('/maintenance/firms');
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const rawFirms: CompanyOption[] = firmsResponse ?? [];

  const firms = useMemo(() => {
    return filterByFirmAccess(rawFirms, user?.firm_access);
  }, [rawFirms, user?.firm_access]);

  const [internalSelectedId, setInternalSelectedId] = useState<string>('');

  const selectedId = value !== undefined ? value : internalSelectedId;

  // Dynamically prefill / update when a specific project is selected in the top bar
  useEffect(() => {
    if (firms.length === 0) return;
    if (selectedProject && selectedProject.id !== 'all') {
      const match = firms.find((f) => String(f.id) === String(selectedProject.id));
      if (match && String(selectedId) !== String(match.id)) {
        setInternalSelectedId(String(match.id));
        onSelect?.({ id: String(match.id), name: match.name });
      }
    }
  }, [selectedProject?.id, firms, selectedId, onSelect]);

  // Handle initial defaultValue if provided and no selection exists
  useEffect(() => {
    if (firms.length === 0 || selectedId) return;
    if (defaultValue) {
      const match = firms.find((f) => String(f.id) === String(defaultValue));
      if (match) {
        setInternalSelectedId(String(match.id));
        onSelect?.({ id: String(match.id), name: match.name });
      }
    }
  }, [defaultValue, firms, selectedId, onSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setInternalSelectedId(newId);
    if (!newId) {
      onSelect?.({ id: '', name: '' });
      return;
    }
    const chosen = firms.find((f) => String(f.id) === String(newId));
    if (chosen) {
      onSelect?.({ id: String(chosen.id), name: chosen.name });
    }
  };

  return (
    <div className="text-xs">
      <select
        className={
          className ||
          'w-full px-3 py-2 rounded-xl border border-input bg-background text-foreground text-sm font-medium focus:ring-2 focus:ring-ring focus:outline-hidden transition-colors'
        }
        value={selectedId}
        onChange={handleChange}
        disabled={disabled || isLoading}
      >
        {isLoading && firms.length === 0 && (
          <option value="" disabled>
            Loading projects (firms)…
          </option>
        )}
        {!isLoading && firms.length === 0 && (
          <option value="" disabled>
            No projects/firms available
          </option>
        )}
        {firms.length > 0 && (
          <option value="">Select firm</option>
        )}
        {firms.map((firm) => (
          <option key={firm.id} value={String(firm.id)}>
            {firm.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CompanySelectField;
