import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { UserPermissions, RefreshTokenData } from './types';

const prisma = new PrismaClient();

// Configurações JWT
const JWT_SECRET = process.env.JWT_SECRET || 'bmad-jwt-secret-dev-only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'bmad-refresh-secret-dev-only';
const ACCESS_TOKEN_EXPIRY = '30m'; // 30 minutos
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 dias

export interface JWTPayload {
  userId: string;
  whatsapp: string;
  cargo: string;
  permissions: any;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// RefreshTokenData agora está em types.ts

export class JWTService {
  /**
   * Gerar par de tokens (access + refresh)
   */
  static async generateTokens(usuario: any): Promise<TokenPair> {
    const payload: JWTPayload = {
      userId: usuario.id,
      whatsapp: usuario.whatsapp,
      cargo: usuario.cargo,
      permissions: usuario.permissions || {},
    };

    // Gerar access token
    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'bmad-laura-system',
      audience: 'bmad-users',
    });

    // Gerar refresh token
    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    const refreshToken = jwt.sign(
      { tokenId: refreshTokenValue, userId: usuario.id },
      JWT_REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'bmad-laura-system',
        audience: 'bmad-users',
      }
    );

    // Salvar refresh token no banco (temporariamente usando campo JSON)
    // TODO: Criar tabela específica para refresh tokens
    try {
      await prisma.usuario.update({
        where: { id: usuario.id },
                          data: {
          permissions: {
            ...((usuario.permissions as any) || {}),
            refreshTokens: [
              ...((usuario.permissions as any)?.refreshTokens || []),
              {
                token: refreshTokenValue,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                isRevoked: false,
                createdAt: new Date().toISOString(),
              },
            ],
          } as any,
        },
      });
    } catch (error) {
      console.error('Erro ao salvar refresh token:', error);
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: 30 * 60, // 30 minutos em segundos
    };
  }

  /**
   * Validar access token
   */
  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'bmad-laura-system',
        audience: 'bmad-users',
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      console.error('Token inválido:', (error as Error).message);
      return null;
    }
  }

  /**
   * Validar refresh token
   */
  static async verifyRefreshToken(token: string): Promise<string | null> {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'bmad-laura-system',
        audience: 'bmad-users',
      }) as any;

      // Verificar se o refresh token existe e não foi revogado
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.userId },
      });

      if (!usuario) {
        return null;
      }

      const permissions = (usuario.permissions as any) || {};
      const refreshTokens = permissions.refreshTokens || [];
      const tokenData = refreshTokens.find(
        (rt: any) => rt.token === decoded.tokenId && !rt.isRevoked
      );

      if (!tokenData || new Date() > new Date(tokenData.expiresAt)) {
        return null;
      }

      return decoded.userId;
    } catch (error) {
      console.error('Refresh token inválido:', (error as Error).message);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    const userId = await this.verifyRefreshToken(refreshToken);
    if (!userId) {
      return null;
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) {
      return null;
    }

    return this.generateTokens(usuario);
  }

  /**
   * Revogar refresh token (logout)
   */
  static async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.userId },
      });

      if (!usuario) {
        return false;
      }

            // Marcar token como revogado
      const permissions = (usuario.permissions as any) || {};
      const refreshTokens = permissions.refreshTokens || [];
      const updatedTokens = refreshTokens.map((rt: any) =>
        rt.token === decoded.tokenId ? { ...rt, isRevoked: true } : rt
      );

      await prisma.usuario.update({
        where: { id: decoded.userId },
        data: {
          permissions: {
            ...permissions,
            refreshTokens: updatedTokens,
          } as any,
        },
      });

      return true;
    } catch (error) {
      console.error('Erro ao revogar token:', error);
      return false;
    }
  }

  /**
   * Revogar todos os refresh tokens de um usuário
   */
  static async revokeAllUserTokens(userId: string): Promise<boolean> {
    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
      });

      if (!usuario) {
        return false;
      }

            await prisma.usuario.update({
        where: { id: userId },
        data: {
          permissions: {
            ...((usuario.permissions as any) || {}),
            refreshTokens: [],
          } as any,
        },
      });

      return true;
    } catch (error) {
      console.error('Erro ao revogar todos tokens:', error);
      return false;
    }
  }

  /**
   * Limpar tokens expirados
   */
  static async cleanExpiredTokens(): Promise<void> {
    try {
      const usuarios = await prisma.usuario.findMany({
        where: {
          permissions: {
            not: {},
          },
        },
      });

      for (const usuario of usuarios) {
        const permissions = usuario.permissions as UserPermissions | null;
      const refreshTokens = permissions?.refreshTokens || [];
        const validTokens = refreshTokens.filter(
          (rt: any) => new Date() <= new Date(rt.expiresAt) && !rt.isRevoked
        );

        if (validTokens.length !== refreshTokens.length) {
                    await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
              permissions: {
                ...((usuario.permissions as any) || {}),
                refreshTokens: validTokens,
              } as any,
            },
          });
        }
      }
    } catch (error) {
      console.error('Erro ao limpar tokens expirados:', error);
    }
  }
}

// Limpar tokens expirados a cada hora
setInterval(() => {
  JWTService.cleanExpiredTokens();
}, 60 * 60 * 1000);
