// @ts-nocheck
// Auth Store adapter for PMS components, bridging to master-frontend AuthContext
export interface AuthUser {
  id?: string | number;
  username?: string;
  name?: string;
  role?: string;
  firm_id?: number | string;
  [key: string]: any;
}

export const useAuthStore = () => {
  let user: AuthUser | null = null;
  try {
    const stored = localStorage.getItem('user') || localStorage.getItem('auth_user');
    if (stored) {
      user = JSON.parse(stored);
    }
  } catch {
    // ignore
  }

  return {
    user: user || { id: 'admin', username: 'admin', name: 'Admin User', role: 'ADMIN' },
    isAuthenticated: true,
    login: () => {},
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    },
    initializeAuth: () => {}
  };
};

export default useAuthStore;
