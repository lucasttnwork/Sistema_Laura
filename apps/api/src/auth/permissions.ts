// Sistema de permissões baseado em RBAC (Role-Based Access Control)
//
// IMPORTANTE:
// - As permissões são DERIVADAS dinamicamente do cargo do usuário
// - NÃO são persistidas no banco de dados
// - São calculadas on-demand via getPermissionsByCargo(cargo)
// - Devem ser incluídas no JWT apenas no momento do login/refresh
//
import { UserPermissions } from './types';

// Catálogo de permissões disponíveis no sistema
export const PERMISSION_CATALOG = {
  canCreatePedidos: 'Criar pedidos e enfileirar jobs',
  canViewPedidos: 'Listar e visualizar pedidos',
  canApprovePedidos: 'Aprovar pedidos (limitado por maxApprovalValue)',
  canViewReports: 'Acessar relatórios gerenciais',
  canManageUsers: 'Gerenciar usuários e permissões',
  canAccessFinancial: 'Acessar informações financeiras',
  maxApprovalValue: 'Valor máximo (R$) que o usuário pode aprovar',
};

// Mapeamento de cargos para permissões
// ATENÇÃO: As chaves dos cargos devem ser minúsculas para comparação case-insensitive
// Este mapeamento define as permissões base para cada cargo
export const ROLE_PERMISSION_MAP: Record<string, UserPermissions> = {
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

/**
 * Obtém as permissões do usuário baseado no seu cargo
 *
 * Esta é a FUNÇÃO PRINCIPAL para obter permissões - sempre use esta função
 * em vez de acessar ROLE_PERMISSION_MAP diretamente.
 *
 * As permissões são calculadas dinamicamente e não são armazenadas no banco.
 *
 * @param cargo - Nome do cargo do usuário (case-insensitive)
 * @returns UserPermissions - Objeto com todas as permissões do usuário
 */
export function getPermissionsByCargo(cargo: string): UserPermissions {
  const key = (cargo || 'default').toLowerCase();
  return (ROLE_PERMISSION_MAP[key] ?? ROLE_PERMISSION_MAP.default);
}

export function hasPermission(userPermissions: UserPermissions | undefined, permission: keyof UserPermissions): boolean {
  return userPermissions?.[permission] === true;
}

export function canApproveValue(userPermissions: UserPermissions | undefined, value: number): boolean {
  const maxApproval = userPermissions?.maxApprovalValue || 0;
  return value <= maxApproval;
}
