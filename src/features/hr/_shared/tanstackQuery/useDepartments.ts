import { useQuery } from '@tanstack/react-query';
import { fetchDepartments } from '../api/departmentsApi';

export const useDepartmentOptions = () =>
  useQuery({
    queryKey: ['hr', 'departments'],
    queryFn: fetchDepartments,
    staleTime: 10 * 60 * 1000,
  });
