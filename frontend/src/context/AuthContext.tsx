import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Role } from '../types/index.js';
import { authService } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isSales: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('crm_access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await authService.me();
      setUser(res.data.data);
      localStorage.setItem('crm_user', JSON.stringify(res.data.data));
    } catch (err) {
      console.error('Failed to load user info:', err);
      setUser(null);
      localStorage.removeItem('crm_access_token');
      localStorage.removeItem('crm_refresh_token');
      localStorage.removeItem('crm_user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (credentials: any) => {
    const res = await authService.login(credentials);
    const { user: userData, accessToken, refreshToken } = res.data.data;

    localStorage.setItem('crm_access_token', accessToken);
    localStorage.setItem('crm_refresh_token', refreshToken);
    localStorage.setItem('crm_user', JSON.stringify(userData));

    setUser(userData);
  };

  const register = async (data: any) => {
    const res = await authService.register(data);
    const { user: userData, accessToken, refreshToken } = res.data.data;

    localStorage.setItem('crm_access_token', accessToken);
    localStorage.setItem('crm_refresh_token', refreshToken);
    localStorage.setItem('crm_user', JSON.stringify(userData));

    setUser(userData);
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('crm_refresh_token') || undefined;
      await authService.logout(refreshToken);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('crm_access_token');
      localStorage.removeItem('crm_refresh_token');
      localStorage.removeItem('crm_user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const hasRole = (roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isSales = user?.role === 'SALES_EXECUTIVE';
  const isViewer = user?.role === 'VIEWER';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
        hasRole,
        isAdmin,
        isManager,
        isSales,
        isViewer
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
