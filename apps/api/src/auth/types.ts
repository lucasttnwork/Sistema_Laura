// Interfaces para tipos de dados de autenticação
//
// NOTA SOBRE PERMISSÕES:
// - UserPermissions NÃO é persistido no banco de dados
// - É derivado dinamicamente do cargo via getPermissionsByCargo(cargo)
// - Deve ser calculado on-demand no momento do login/refresh

export interface UserPermissions {
  canCreatePedidos: boolean;
  canViewPedidos: boolean;
  canApprovePedidos: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canAccessFinancial: boolean;
  maxApprovalValue: number;
}

export interface RefreshTokenData {
  token: string;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
}

export interface Usuario {
  id: string;
  nome: string;
  cargo: string;
  whatsapp: string;
  password: string;
  loginAttempts?: number;
  lockedUntil?: Date | null;
  lastLogin?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  whatsapp: string;
  cargo: string;
  // IMPORTANTE: permissions deve ser preenchido via getPermissionsByCargo(cargo)
  // no momento do login/refresh - não armazenar no banco de dados
  permissions?: UserPermissions;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    nome: string;
    cargo: string;
    whatsapp: string;
    permissions?: UserPermissions;
  };
  tokens?: Tokens;
  message?: string;
  error?: string;
}

// Extensões para Request do Express
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
