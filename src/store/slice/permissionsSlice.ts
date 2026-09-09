import { Role } from '@/types/permissions';

export const selectUserRole = (state: any): Role => {
  return state?.role || Role.ADMIN;
};
