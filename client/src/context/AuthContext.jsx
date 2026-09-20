import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nexus_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('nexus_auth_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Synchronize authentication state on initial load
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('nexus_auth_token');
      if (savedToken) {
        try {
          const res = await authAPI.getMe();
          if (res.data.success) {
            setUser(res.data.data);
            localStorage.setItem('nexus_user', JSON.stringify(res.data.data));
          }
        } catch (err) {
          console.error('Session expired or invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();

    // Listen to global 401 unauthorized event
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await authAPI.login({ email, password });
      if (res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('nexus_auth_token', receivedToken);
        localStorage.setItem('nexus_user', JSON.stringify(receivedUser));
        return { success: true };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(message);
      return { success: false, message };
    }
  };

  const register = async (name, email, password, role = 'client') => {
    setError(null);
    try {
      const res = await authAPI.register({ name, email, password, role });
      if (res.data.success) {
        const { token: receivedToken, user: receivedUser } = res.data.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('nexus_auth_token', receivedToken);
        localStorage.setItem('nexus_user', JSON.stringify(receivedUser));
        return { success: true };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed.';
      setError(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('nexus_auth_token');
    localStorage.removeItem('nexus_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'admin',
        loading,
        error,
        login,
        register,
        logout,
        setError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
