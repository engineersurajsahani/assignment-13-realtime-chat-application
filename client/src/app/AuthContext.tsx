import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types/index.js';
import { authService } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pulsechat_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('pulsechat_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await authService.getMe();
        setUser(res.data.user);
      } catch (err) {
        localStorage.removeItem('pulsechat_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, []);

  const login = async (credentials: any) => {
    const res = await authService.login(credentials);
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('pulsechat_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
  };

  const register = async (data: any) => {
    const res = await authService.register(data);
    const { token: receivedToken, user: receivedUser } = res.data;
    localStorage.setItem('pulsechat_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('pulsechat_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
