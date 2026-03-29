// src/context/AuthContext.jsx
// Global auth state: user, token, login/logout helpers

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_user')); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Re-validate token on mount
  useEffect(() => {
    const token = localStorage.getItem('sb_token');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('sb_token', token);
    localStorage.setItem('sb_user',  JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('sb_token');
    localStorage.removeItem('sb_user');
    setUser(null);
  };

  // Refresh user data from API
  const refreshUser = async () => {
    const { data } = await api.get('/auth/me');
    setUser(data);
    localStorage.setItem('sb_user', JSON.stringify(data));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
