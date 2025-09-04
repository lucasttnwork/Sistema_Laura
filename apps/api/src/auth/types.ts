// Interfaces para tipos de dados de autenticação

export interface UserPermissions {
  canCreatePedidos?: boolean;
  canApprovePedidos?: boolean;
  canViewPedidos?: boolean;
  canViewOrcamentos?: boolean;
  canViewReports?: boolean;
  canManageUsers?: boolean;
  canAccessFinancial?: boolean;
  maxApprovalValue?: number;
  
  // Dados de autenticação
  hashedPassword?: string;
  lastLogin?: string;
  loginAttempts?: number;
  lockedUntil?: string;
  
  // Refresh tokens
  refreshTokens?: RefreshTokenData[];
}

export interface RefreshTokenData {
  token: string;
  expiresAt: string;
  isRevoked: boolean;
  createdAt: string;
}

export interface UsuarioWithAuth {
  id: string;
  nome: string;
  cargo: string;
  whatsapp: string;
  permissions: UserPermissions | null;
  createdAt: Date;
  updatedAt: Date;
}
