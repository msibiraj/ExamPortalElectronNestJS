import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api
        .get('/auth/profile')
        .then(({ data }) => setUser(data))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const signup = async (name, email, password, role = 'proctor', organizationCode = '') => {
    const { data } = await api.post('/auth/signup', { name, email, password, role, organizationCode });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  // Returns true if the current user has the given permission.
  // Non-admins always return true (their access is governed by role, not fine-grained perms).
  // Admins with permissions === null are unrestricted (super admin).
  const hasPermission = (perm) => {
    if (!user) return false;
    if (user.role !== 'admin') return true;
    if (user.permissions == null) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(perm);
  };

  // Returns true if the current user has at least one of the listed permissions.
  const hasAnyPermission = (...perms) => perms.some((p) => hasPermission(p));

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
