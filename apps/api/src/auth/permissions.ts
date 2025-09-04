// Catálogo de permissões e mapa de roles → permissões (RBAC)

export type PermissionKey =
  | 'canCreatePedidos'
  | 'canViewPedidos'
  | 'canApprovePedidos'
  | 'canViewReports'
  | 'canManageUsers'
  | 'canAccessFinancial';

export type PermissionSet = {
  [K in PermissionKey]?: boolean;
} & {
  maxApprovalValue?: number;
  // Campos operacionais gravados em permissions JSON, não fazem parte do RBAC em si
  hashedPassword?: string | null;
  lastLogin?: string | null;
  loginAttempts?: number;
  lockedUntil?: string | null;
  refreshTokens?: Array<{
    token: string;
    expiresAt: string;
    isRevoked: boolean;
    createdAt: string;
  }>;
};

export const PERMISSION_CATALOG: Record<PermissionKey | 'maxApprovalValue', string> = {
  canCreatePedidos: 'Criar pedidos e enfileirar jobs',
  canViewPedidos: 'Listar e visualizar pedidos',
  canApprovePedidos: 'Aprovar pedidos (limitado por maxApprovalValue)',
  canViewReports: 'Acessar relatórios gerenciais',
  canManageUsers: 'Gerenciar usuários e permissões',
  canAccessFinancial: 'Acessar informações financeiras',
  maxApprovalValue: 'Valor máximo (R$) que o usuário pode aprovar',
};

// Observação: as chaves dos cargos devem ser minúsculas para comparação case-insensitive
export const ROLE_PERMISSION_MAP: Record<string, PermissionSet> = {
  'engenheiro civil': {
    canCreatePedidos: true,
    canViewPedidos: true,
    canApprovePedidos: true,
    canViewReports: true,
    canManageUsers: true,
    canAccessFinancial: true,
    maxApprovalValue: 100000.0,
  },
  'gerente de projetos': {
    canCreatePedidos: true,
    canViewPedidos: true,
    canApprovePedidos: true,
    canViewReports: true,
    canManageUsers: true,
    canAccessFinancial: true,
    maxApprovalValue: 100000.0,
  },
  'fiscal de obra': {
    canCreatePedidos: true,
    canViewPedidos: true,
    canApprovePedidos: false,
    canViewReports: true,
    canManageUsers: false,
    canAccessFinancial: false,
    maxApprovalValue: 10000.0,
  },
  'mestre de obra': {
    canCreatePedidos: true,
    canViewPedidos: true,
    canApprovePedidos: false,
    canViewReports: false,
    canManageUsers: false,
    canAccessFinancial: false,
    maxApprovalValue: 5000.0,
  },
  supervisor: {
    canCreatePedidos: true,
    canViewPedidos: true,
    canApprovePedidos: false,
    canViewReports: false,
    canManageUsers: false,
    canAccessFinancial: false,
    maxApprovalValue: 5000.0,
  },
  // fallback padrão para cargos não mapeados
  default: {
    canCreatePedidos: true,
    canViewPedidos: true,
    canApprovePedidos: false,
    canViewReports: false,
    canManageUsers: false,
    canAccessFinancial: false,
    maxApprovalValue: 1000.0,
  },
};

export function getPermissionsByCargo(cargo: string): PermissionSet {
  const key = (cargo || 'default').toLowerCase();
  return (ROLE_PERMISSION_MAP[key] ?? ROLE_PERMISSION_MAP.default) as PermissionSet;
}

export function hasPermission(userPermissions: PermissionSet | any, permission: PermissionKey): boolean {
  return userPermissions?.[permission] === true;
}

export function canApproveValue(userPermissions: PermissionSet | any, value: number): boolean {
  const maxApproval = userPermissions?.maxApprovalValue || 0;
  return value <= maxApproval;
}


