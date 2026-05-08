/* ============================================
 * EduRAG Frontend — Auth Context
 * JWT state management, login/logout, auto-refresh
 * ============================================ */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getAccessToken,
  saveTokens,
  clearTokens,
  ApiError,
} from '../services/api';
import type { TeacherLogin, TeacherRegister, TokenResponse } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (data: TeacherLogin) => Promise<void>;
  register: (data: TeacherRegister) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: !!getAccessToken(),
    isLoading: false,
    error: null,
  });

  // Token süresi dolmadan önce auto-refresh
  useEffect(() => {
    if (!state.isAuthenticated) return;

    // Auto-refresh every 13 minutes (token expires at 15 min)
    const interval = setInterval(async () => {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return;

        const res = await fetch('http://localhost:8000/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (res.ok) {
          const tokens: TokenResponse = await res.json();
          saveTokens(tokens);
        } else {
          clearTokens();
          setState({ isAuthenticated: false, isLoading: false, error: null });
        }
      } catch {
        // Silently absorb — caught on next API call
      }
    }, 13 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.isAuthenticated]);

  const login = useCallback(async (data: TeacherLogin) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await apiLogin(data);
      setState({ isAuthenticated: true, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Login failed';
      setState({ isAuthenticated: false, isLoading: false, error: message });
      throw err;
    }
  }, []);

  const register = useCallback(async (data: TeacherRegister) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await apiRegister(data);
      setState(prev => ({ ...prev, isLoading: false, error: null }));
    } catch (err) {
      const message = err instanceof ApiError ? err.detail : 'Registration failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setState({ isAuthenticated: false, isLoading: false, error: null });
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
