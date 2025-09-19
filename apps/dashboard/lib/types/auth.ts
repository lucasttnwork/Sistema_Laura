// Tipos para autenticação
export interface User {
  id: string;
  nome: string;
  cargo: string;
  whatsapp: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  tokens?: Tokens;
  message?: string;
  error?: string;
}

export interface LoginCredentials {
  whatsapp: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  setTokens: (tokens: Tokens) => void;
  clearAuth: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: User | null) => void;
}
