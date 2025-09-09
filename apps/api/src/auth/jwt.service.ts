import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { Usuario, Tokens, JWTPayload } from './types';
import { getPermissionsByCargo } from './permissions';

const prisma = new PrismaClient();

// Configurações JWT
const JWT_SECRET = process.env.JWT_SECRET || 'bmad-jwt-secret-dev-only';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'bmad-refresh-secret-dev-only';
const ACCESS_TOKEN_EXPIRY = '30m'; // 30 minutos
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 dias

export class JWTService {
  /**
   * Gerar par de tokens (access + refresh)
   */
  static async generateTokens(user: Usuario): Promise<Tokens> {
    const payload: JWTPayload = {
      userId: user.id,
      whatsapp: user.whatsapp,
      cargo: user.cargo,
      permissions: getPermissionsByCargo(user.cargo),
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
      { tokenId: refreshTokenValue, userId: user.id },
      JWT_REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'bmad-laura-system',
        audience: 'bmad-users',
      }
    );

    // Salvar refresh token no banco
    try {
      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshTokenValue,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isRevoked: false,
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
      }) as { tokenId: string; userId: string };

      // Verificar se o refresh token existe e não foi revogado
      const refreshTokenData = await prisma.refreshToken.findFirst({
        where: {
          token: decoded.tokenId,
          userId: decoded.userId,
          isRevoked: false,
        },
      });

      if (!refreshTokenData) {
        return null;
      }

      // Verificar se não expirou
      if (new Date() > refreshTokenData.expiresAt) {
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
  static async refreshAccessToken(refreshToken: string): Promise<Tokens | null> {
    const userId = await this.verifyRefreshToken(refreshToken);
    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return this.generateTokens(user);
  }

  /**
   * Revogar refresh token (logout)
   */
  static async revokeRefreshToken(refreshToken: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
        tokenId: string;
        userId: string;
      };

      await prisma.refreshToken.updateMany({
        where: {
          token: decoded.tokenId,
          userId: decoded.userId,
        },
        data: {
          isRevoked: true,
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
      await prisma.refreshToken.updateMany({
        where: {
          userId: userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
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
      // Remover tokens expirados e revogados da tabela refreshToken
      await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            {
              expiresAt: {
                lt: new Date(),
              },
            },
            {
              isRevoked: true,
            },
          ],
        },
      });
    } catch (error) {
      console.error('Erro ao limpar tokens expirados:', error);
    }
  }
}

// Limpar tokens expirados a cada hora
setInterval(() => {
  JWTService.cleanExpiredTokens();
}, 60 * 60 * 1000);
