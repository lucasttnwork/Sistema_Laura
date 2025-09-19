import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AuthState, AuthActions, User, Tokens, LoginCredentials } from '../types/auth';
import { detectBrowserCompatibility, shouldUseExtendedCompatibility, getCompatibilityWarning } from '../utils/browser-compatibility';

// Configuração da API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

// Alias para manter compatibilidade com código existente
const detectBrowserIssues = detectBrowserCompatibility;

// Função para fazer fetch com fallback automático
const fetchWithFallback = async (url: string, options: RequestInit): Promise<Response> => {
  const browserInfo = detectBrowserIssues();
  const endpoint = url.split('/').pop() || 'unknown';

  // Tentar primeiro com credentials (mais seguro)
  if (browserInfo.shouldUseCredentials) {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include'
      });

      // Se a resposta for bem-sucedida, usar credentials
      if (response.ok || response.status === 401) {
        return response;
      }
    } catch (error) {
      console.warn(`🔄 ${endpoint}: Falha com credentials, tentando fallback...`, error.message);
    }
  }

  // Fallback: tentar sem credentials
  try {
    const response = await fetch(url, {
      ...options,
      // credentials: 'omit' (padrão)
    });

    // Log de sucesso do fallback
    if (!browserInfo.shouldUseCredentials) {
      console.info(`✅ ${endpoint}: Usando modo compatibilidade (sem credentials)`);
    } else {
      console.warn(`⚠️ ${endpoint}: Fallback ativado - resposta sem credentials`);
    }

    return response;
  } catch (error) {
    console.error(`❌ ${endpoint}: Falha crítica em ambos os modos`, error);
    throw error;
  }
};

// Estado inicial
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Store de autenticação com Zustand
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Setters básicos
      setTokens: (tokens: Tokens) => {
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        });
      },

      setUser: (user: User | null) => {
        set({ user });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      // Login
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetchWithFallback(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Erro no login');
          }

          if (data.tokens && data.user) {
            // Guardar tokens apenas em memória (não localStorage)
            set({
              user: data.user,
              accessToken: data.tokens.accessToken,
              refreshToken: data.tokens.refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            throw new Error('Dados de autenticação incompletos');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          set({
            error: errorMessage,
            isLoading: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      // Logout
      logout: async () => {
        const { refreshToken } = get();

        try {
          if (refreshToken) {
            // Fazer logout na API (opcional, mas recomendado)
            await fetchWithFallback(`${API_BASE_URL}/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ refreshToken }),
            });
          }
        } catch (error) {
          console.warn('Erro ao fazer logout na API:', error);
          // Não falhar o logout local por erro na API
        }

        // Limpar estado completamente
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });

        // Limpar qualquer dado remanescente em localStorage (segurança extra)
        try {
          // Limpar chaves relacionadas à autenticação que possam existir
          const keysToRemove = [
            'auth-storage',
            'zustand-auth',
            'token',
            'refreshToken',
            'user',
            'auth',
          ];

          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });

          // Limpar qualquer chave que contenha termos relacionados à autenticação
          Object.keys(localStorage).forEach(key => {
            if (key.toLowerCase().includes('auth') ||
                key.toLowerCase().includes('token') ||
                key.toLowerCase().includes('user')) {
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          console.warn('Erro ao limpar localStorage:', error);
        }
      },

      // Refresh token
      refreshToken: async (): Promise<boolean> => {
        const { refreshToken } = get();

        if (!refreshToken) {
          return false;
        }

        try {
          const response = await fetchWithFallback(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          const data = await response.json();

          if (!response.ok || !data.success || !data.tokens) {
            throw new Error('Falha ao renovar token');
          }

          // Atualizar tokens em memória
          set({
            accessToken: data.tokens.accessToken,
            refreshToken: data.tokens.refreshToken,
            isAuthenticated: true,
          });

          return true;
        } catch (error) {
          console.error('Erro ao renovar token:', error);

          // Se falhou, limpar autenticação
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: 'Sessão expirada. Faça login novamente.',
          });

          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      // Não persistir tokens em localStorage - apenas user e estado básico
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // NUNCA persistir tokens em localStorage
      }),
    }
  )
);

// Hooks auxiliares
export const useAuth = () => {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshToken: refresh,
    setError,
  } = useAuthStore();

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshToken: refresh,
    setError,
  };
};

// Hook para verificar se usuário tem permissão
export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    permissions: user?.permissions || [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};
