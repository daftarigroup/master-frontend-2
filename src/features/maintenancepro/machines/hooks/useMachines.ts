'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Machine, MachineCategory, MachineFilters, MachineSortConfig } from '../types/types';

export const useMachinesFilters = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<MachineFilters>({
    department: 'all',
    status: 'all',
    category: 'all',
  });
  const [sortConfig, setSortConfig] = useState<MachineSortConfig>({
    column: 'name',
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = useCallback((column: string) => {
    setSortConfig((cur) => ({
      column,
      direction: cur.column === column && cur.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleFilterChange = useCallback((key: keyof MachineFilters, value: string) => {
    setFilters((cur) => ({ ...cur, [key]: value }));
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  return {
    searchTerm,
    filters,
    sortConfig,
    currentPage,
    setCurrentPage,
    handleSort,
    handleFilterChange,
    handleSearchChange,
  };
};

export const useFilteredMachines = (
  machines: Machine[],
  searchTerm: string,
  filters: MachineFilters,
  sortConfig: MachineSortConfig
) => {
  return useMemo(() => {
    const q = searchTerm.toLowerCase();

    return machines
      .filter((machine) => {
        const matchesSearch =
          !q ||
          machine.name?.toLowerCase().includes(q) ||
          machine.serialNumber?.toLowerCase().includes(q) ||
          machine.assetCode?.toLowerCase().includes(q) ||
          machine.location?.toLowerCase().includes(q) ||
          machine.manufacturer?.toLowerCase().includes(q) ||
          machine.department?.name?.toLowerCase().includes(q);

        const matchesDepartment =
          filters.department === 'all' || machine.department?.name === filters.department;

        const matchesStatus =
          filters.status === 'all' ||
          machine.status?.toUpperCase() === filters.status.toUpperCase();

        const matchesCategory =
          filters.category === 'all' || machine.category === (filters.category as MachineCategory);

        return matchesSearch && matchesDepartment && matchesStatus && matchesCategory;
      })
      .sort((a, b) => {
        const col = sortConfig.column as keyof Machine;
        const aVal =
          col === 'department' ? (a.department?.name ?? '') : ((a[col] as string | null) ?? '');
        const bVal =
          col === 'department' ? (b.department?.name ?? '') : ((b[col] as string | null) ?? '');

        return sortConfig.direction === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [machines, searchTerm, filters, sortConfig]);
};

export const usePaginatedMachines = (
  filteredMachines: Machine[],
  currentPage: number,
  itemsPerPage: number
) => {
  const totalPages = Math.max(1, Math.ceil(filteredMachines.length / itemsPerPage));
  const paginatedMachines = filteredMachines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  return { totalPages, paginatedMachines };
};

export const useDepartments = (machines: Machine[]) => {
  return useMemo(
    () => Array.from(new Set(machines.map((m) => m.department?.name).filter(Boolean))),
    [machines]
  );
};
