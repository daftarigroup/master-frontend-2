export const Role = {
  SUPERADMIN: 'SUPERADMIN',
  SUPER_ADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  USER: 'USER',
  MANAGER: 'MANAGER',
  HR: 'HR',
} as const;

export type Role = (typeof Role)[keyof typeof Role] | 'SUPERADMIN';
