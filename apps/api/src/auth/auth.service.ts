import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { JWTService } from './jwt.service';
import { getPermissionsByCargo, hasPermission, canApproveValue } from './permissions';
import { Usuario, AuthResponse, Tokens, UserPermissions } from './types';

const prisma = new PrismaClient();

// Normaliza um telefone para formato E.164 com "+" (supondo que o número já contenha o código do país)
function normalizePhoneToE164(raw: string): string {
  const trimmed = (raw || '').trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return '';
  return `+${digits}`;
}

// Schemas de validação
export const LoginSchema = z.object({
  whatsapp: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Número deve estar no formato E.164 (com ou sem "+" de entrada)'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const RegisterSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cargo: z.string().min(2, 'Cargo é obrigatório'),
  whatsapp: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Número deve estar no formato E.164 (com ou sem "+" de entrada)'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

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
      const validData = RegisterSchema.parse(data);
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
      console.error('Erro no registro:', error);
      return {
        success: false,
        error: error instanceof z.ZodError ? error.errors[0]?.message || 'Erro de validação' : 'Erro interno do servidor',
      };
    }
  }

  /**
   * Login do usuário
   */
  static async login(data: any): Promise<AuthResponse> {
    try {
      // Validar dados
      const validData = LoginSchema.parse(data);
      const normalizedWhatsapp = normalizePhoneToE164(validData.whatsapp);

      // Buscar usuário
      const user = await prisma.user.findUnique({
        where: { whatsapp: normalizedWhatsapp },
      });

      if (!user) {
        return {
          success: false,
          error: 'Usuário não encontrado',
        };
      }

      // Verificar se conta não está bloqueada
      if ((user as any).lockedUntil && new Date() < new Date((user as any).lockedUntil)) {
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
      console.error('Erro no login:', error);
      return {
        success: false,
        error: error instanceof z.ZodError ? error.errors[0]?.message || 'Erro de validação' : 'Erro interno do servidor',
      };
    }
  }

  /**
   * Logout do usuário
   */
  static async logout(refreshToken: string): Promise<AuthResponse> {
    try {
      const revoked = await JWTService.revokeRefreshToken(refreshToken);
      return {
        success: revoked,
        message: revoked ? 'Logout realizado com sucesso' : 'Token inválido',
      };
    } catch (error) {
      console.error('Erro no logout:', error);
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
        return {
          success: false,
          error: 'Refresh token inválido ou expirado',
        };
      }
      return {
        success: true,
        tokens: newTokens,
        message: 'Token renovado com sucesso',
      };
    } catch (error) {
      console.error('Erro ao renovar token:', error);
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
