// Usamos require para evitar problemas de tipos em ambientes de build/lint
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bcrypt: { hash: (p: string, rounds: number) => Promise<string>; compare: (p: string, h: string) => Promise<boolean> } = require('bcryptjs');
import { PrismaClient } from '@prisma/client';
import { JWTService } from './jwt.service';
import { getPermissionsByCargo, hasPermission, canApproveValue } from './permissions';
import { Usuario, AuthResponse, Tokens, UserPermissions } from './types';
import { logger } from '@bmad/observability';

const prisma = new PrismaClient();

// Normaliza um telefone para formato E.164 com "+" (supondo que o número já contenha o código do país)
function normalizePhoneToE164(raw: string): string {
  const trimmed = (raw || '').trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return '';
  return `+${digits}`;
}

// Validações simples (evita dependência de zod neste módulo)
function ensureString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} é obrigatório`);
  }
  return value.trim();
}

function validateWhatsapp(raw: string): string {
  const v = ensureString(raw, 'whatsapp');
  const digits = v.replace(/[^\d+]/g, '');
  const e164 = digits.startsWith('+') ? digits : `+${digits}`;
  if (!/^\+?[1-9]\d{1,14}$/.test(e164)) {
    throw new Error('Número deve estar no formato E.164 (com ou sem "+" de entrada)');
  }
  return e164;
}

function validateLogin(data: any): { whatsapp: string; password: string } {
  const whatsapp = validateWhatsapp(data?.whatsapp);
  const password = ensureString(data?.password, 'Senha');
  return { whatsapp, password };
}

function validateRegister(data: any): { nome: string; cargo: string; whatsapp: string; password: string } {
  const nome = ensureString(data?.nome, 'Nome');
  if (nome.length < 2) throw new Error('Nome deve ter pelo menos 2 caracteres');
  const cargo = ensureString(data?.cargo, 'Cargo');
  if (cargo.length < 2) throw new Error('Cargo é obrigatório');
  const whatsapp = validateWhatsapp(data?.whatsapp);
  const password = ensureString(data?.password, 'Senha');
  if (password.length < 8) throw new Error('Senha deve ter pelo menos 8 caracteres');
  return { nome, cargo, whatsapp, password };
}

export class AuthService {
  /**
   * Hash da senha usando bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Segurança alta
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verificar senha
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Registrar novo usuário
   */
  static async register(data: any): Promise<AuthResponse> {
    try {
      // Validar dados
      const validData = validateRegister(data);
      const normalizedWhatsapp = normalizePhoneToE164(validData.whatsapp);

      // Verificar se usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { whatsapp: normalizedWhatsapp },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'Usuário com este WhatsApp já existe',
        };
      }

      // Hash da senha
      const hashedPassword = await this.hashPassword(validData.password);

      // Definir permissões baseadas no cargo (apenas para retorno, não armazenado no DB)
      const permissions = getPermissionsByCargo(validData.cargo);

      // Criar usuário
      const user = await prisma.user.create({
        data: {
          nome: validData.nome,
          cargo: validData.cargo,
          whatsapp: normalizedWhatsapp,
          password: hashedPassword, // Senha hashada no campo próprio
        },
      });

      // Gerar tokens
      const tokens = await JWTService.generateTokens(user);

      logger.info('auth.register.success', {
        userId: user.id,
        whatsapp: user.whatsapp,
        cargo: user.cargo,
      });

      return {
        success: true,
        user: {
          id: user.id,
          nome: user.nome,
          cargo: user.cargo,
          whatsapp: user.whatsapp,
          permissions: permissions, // Permissões calculadas dinamicamente
        },
        tokens,
        message: 'Usuário registrado com sucesso',
      };
    } catch (error: any) {
      logger.error('auth.register.error', {
        error: error?.message || String(error),
      });
      return {
        success: false,
        error: error?.message || 'Erro de validação',
      };
    }
  }

  /**
   * Login do usuário
   */
  static async login(data: any): Promise<AuthResponse> {
    try {
      // Validar dados
      const validData = validateLogin(data);
      const normalizedWhatsapp = normalizePhoneToE164(validData.whatsapp);

      // Buscar usuário
      const user = await prisma.user.findUnique({
        where: { whatsapp: normalizedWhatsapp },
      });

      if (!user) {
        logger.warn('auth.login.user_not_found', { whatsapp: normalizedWhatsapp });
        return {
          success: false,
          error: 'Usuário não encontrado',
        };
      }

      // Verificar se conta não está bloqueada
      if ((user as any).lockedUntil && new Date() < new Date((user as any).lockedUntil)) {
        logger.warn('auth.login.account_locked', { userId: user.id });
        return {
          success: false,
          error: 'Conta temporariamente bloqueada por tentativas excessivas',
        };
      }

      // Verificar senha
      const isPasswordValid = await this.verifyPassword(validData.password, user.password);

      if (!isPasswordValid) {
        // Incrementar tentativas de login
        const currentAttempts = (user as any).loginAttempts || 0;
        const loginAttempts = currentAttempts + 1;
        const shouldLock = loginAttempts >= 5;

        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts,
            lockedUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null, // 30 min
          } as any,
        });

        logger.warn('auth.login.invalid_password', {
          userId: user.id,
          attempts: loginAttempts,
          locked: shouldLock,
        });

        return {
          success: false,
          error: shouldLock
            ? 'Conta bloqueada por 30 minutos devido a tentativas excessivas'
            : 'Senha incorreta',
        };
      }

      // Login bem-sucedido - resetar tentativas e atualizar último login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date(),
        } as any,
      });

      // Definir permissões baseadas no cargo
      const permissions = getPermissionsByCargo(user.cargo);

      // Gerar tokens
      const tokens = await JWTService.generateTokens(user);

      logger.info('auth.login.success', {
        userId: user.id,
        cargo: user.cargo,
      });

      return {
        success: true,
        user: {
          id: user.id,
          nome: user.nome,
          cargo: user.cargo,
          whatsapp: user.whatsapp,
          permissions: permissions, // Permissões calculadas dinamicamente
        },
        tokens,
        message: 'Login realizado com sucesso',
      };
    } catch (error: any) {
      logger.error('auth.login.error', { error: error?.message || String(error) });
      return {
        success: false,
        error: error?.message || 'Erro interno do servidor',
      };
    }
  }

  /**
   * Logout do usuário
   */
  static async logout(refreshToken: string): Promise<AuthResponse> {
    try {
      const revoked = await JWTService.revokeRefreshToken(refreshToken);
      logger.info('auth.logout', { revoked });
      return {
        success: revoked,
        message: revoked ? 'Logout realizado com sucesso' : 'Token inválido',
      };
    } catch (error) {
      logger.error('auth.logout.error', { error: (error as Error).message });
      return {
        success: false,
        message: 'Erro interno do servidor',
      };
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const newTokens = await JWTService.refreshAccessToken(refreshToken);
      if (!newTokens) {
        logger.warn('auth.refresh.failed');
        return {
          success: false,
          error: 'Refresh token inválido ou expirado',
        };
      }
      logger.info('auth.refresh.success');
      return {
        success: true,
        tokens: newTokens,
        message: 'Token renovado com sucesso',
      };
    } catch (error) {
      logger.error('auth.refresh.error', { error: (error as Error).message });
      return {
        success: false,
        error: 'Erro interno do servidor',
      };
    }
  }

  /**
   * Obter permissões baseadas no cargo
   */
  // RBAC movido para permissions.ts (getPermissionsByCargo)

  /**
   * Verificar se usuário tem permissão específica
   */
  static hasPermission(userPermissions: UserPermissions | undefined, permission: keyof UserPermissions): boolean {
    return hasPermission(userPermissions, permission);
  }

  /**
   * Verificar se usuário pode aprovar valor
   */
  static canApproveValue(userPermissions: UserPermissions | undefined, value: number): boolean {
    return canApproveValue(userPermissions, value);
  }
}
