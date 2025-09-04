import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { JWTService, TokenPair } from './jwt.service';
import { z } from 'zod';
import { UserPermissions, UsuarioWithAuth } from './types';
import { getPermissionsByCargo, hasPermission, canApproveValue } from './permissions';

const prisma = new PrismaClient();

// Schemas de validação
export const LoginSchema = z.object({
  whatsapp: z.string().regex(/^\+55\d{10,11}$/, 'WhatsApp deve estar no formato +5511999999999'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const RegisterSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  cargo: z.string().min(2, 'Cargo é obrigatório'),
  whatsapp: z.string().regex(/^\+55\d{10,11}$/, 'WhatsApp deve estar no formato +5511999999999'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
});

export interface LoginRequest {
  whatsapp: string;
  password: string;
}

export interface RegisterRequest {
  nome: string;
  cargo: string;
  whatsapp: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    nome: string;
    cargo: string;
    whatsapp: string;
    permissions: any;
  };
  tokens?: TokenPair;
  message?: string;
  error?: string;
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
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Validar dados
      const validData = RegisterSchema.parse(data);

      // Verificar se usuário já existe
      const existingUser = await prisma.usuario.findUnique({
        where: { whatsapp: validData.whatsapp },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'Usuário com este WhatsApp já existe',
        };
      }

      // Hash da senha
      const hashedPassword = await this.hashPassword(validData.password);

      // Definir permissões baseadas no cargo
      const permissions = getPermissionsByCargo(validData.cargo);

      // Criar usuário
      const usuario = await prisma.usuario.create({
        data: {
          nome: validData.nome,
          cargo: validData.cargo,
          whatsapp: validData.whatsapp,
          permissions: {
            ...permissions,
            hashedPassword,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            loginAttempts: 0,
            lockedUntil: null,
          },
        },
      });

      // Gerar tokens
      const tokens = await JWTService.generateTokens(usuario);

      return {
        success: true,
        user: {
          id: usuario.id,
          nome: usuario.nome,
          cargo: usuario.cargo,
          whatsapp: usuario.whatsapp,
          permissions: permissions,
        },
        tokens,
        message: 'Usuário registrado com sucesso',
      };
    } catch (error) {
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
  static async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Validar dados
      const validData = LoginSchema.parse(data);

      // Buscar usuário
      const usuario = await prisma.usuario.findUnique({
        where: { whatsapp: validData.whatsapp },
      });

      if (!usuario) {
        return {
          success: false,
          error: 'Usuário não encontrado',
        };
      }

      // Verificar se conta não está bloqueada
      const permissions = usuario.permissions as UserPermissions | null;
      const lockedUntil = permissions?.lockedUntil;
      if (lockedUntil && new Date() < new Date(lockedUntil)) {
        return {
          success: false,
          error: 'Conta temporariamente bloqueada por tentativas excessivas',
        };
      }

      // Verificar senha
      const hashedPassword = permissions?.hashedPassword;
      if (!hashedPassword) {
        return {
          success: false,
          error: 'Usuário não possui senha configurada',
        };
      }

      const isPasswordValid = await this.verifyPassword(validData.password, hashedPassword);

      if (!isPasswordValid) {
        // Incrementar tentativas de login
        const loginAttempts = (permissions?.loginAttempts || 0) + 1;
        const shouldLock = loginAttempts >= 5;

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            permissions: {
              ...(permissions || {}),
              loginAttempts,
              lockedUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null, // 30 min
            } as any,
          },
        });

        return {
          success: false,
          error: shouldLock
            ? 'Conta bloqueada por 30 minutos devido a tentativas excessivas'
            : 'Senha incorreta',
        };
      }

      // Login bem-sucedido - resetar tentativas e atualizar último login
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          permissions: {
            ...(permissions || {}),
            loginAttempts: 0,
            lockedUntil: null,
            lastLogin: new Date().toISOString(),
          } as any,
        },
      });

      // Gerar tokens
      const tokens = await JWTService.generateTokens(usuario);

      return {
        success: true,
        user: {
          id: usuario.id,
          nome: usuario.nome,
          cargo: usuario.cargo,
          whatsapp: usuario.whatsapp,
          permissions: usuario.permissions,
        },
        tokens,
        message: 'Login realizado com sucesso',
      };
    } catch (error) {
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
  static async logout(refreshToken: string): Promise<{ success: boolean; message: string }> {
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
  static hasPermission(userPermissions: any, permission: string): boolean {
    return hasPermission(userPermissions, permission as any);
  }

  /**
   * Verificar se usuário pode aprovar valor
   */
  static canApproveValue(userPermissions: any, value: number): boolean {
    return canApproveValue(userPermissions, value);
  }
}
