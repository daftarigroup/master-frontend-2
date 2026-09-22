import { useState } from 'react';
import type { PlanFrequency, PlanStatus } from '../types/types';

export const usePlansFilter = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFrequency, setFilterFrequency] = useState<PlanFrequency | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<PlanStatus | 'ALL'>('ALL');

  return {
    searchTerm,
    setSearchTerm,
    filterFrequency,
    setFilterFrequency,
    filterStatus,
    setFilterStatus,
  };
};
