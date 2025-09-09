import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { Usuario, Tokens, JWTPayload } from './types';
import { getPermissionsByCargo } from './permissions';
import { logger } from '@bmad/observability';

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
      logger.info('auth.refresh.issued', {
        userId: user.id,
        cargo: user.cargo,
      });
    } catch (error) {
      logger.error('auth.refresh.persist_error', {
        error: (error as Error).message,
        userId: user.id,
      });
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
      logger.warn('auth.access.invalid_token', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Validar refresh token
   */
  static async verifyRefreshToken(token: string): Promise<{ userId: string; tokenId: string } | null> {
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

      return { userId: decoded.userId, tokenId: decoded.tokenId };
    } catch (error) {
      logger.warn('auth.refresh.invalid_token', { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<Tokens | null> {
    const verified = await this.verifyRefreshToken(refreshToken);
    if (!verified) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
    });

    if (!user) {
      return null;
    }

    // Revogar o refresh token usado (rotação)
    try {
      await prisma.refreshToken.updateMany({
        where: { token: verified.tokenId, userId: verified.userId, isRevoked: false },
        data: { isRevoked: true },
      });
      logger.info('auth.refresh.rotated', { userId: verified.userId });
    } catch (error) {
      logger.error('auth.refresh.rotate_error', {
        error: (error as Error).message,
        userId: verified.userId,
      });
      return null;
    }

    // Emitir novos tokens (gera novo refresh e mantém histórico via isRevoked)
    const tokens = await this.generateTokens(user);
    return tokens;
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
      logger.info('auth.logout.revoked_refresh', { userId: decoded.userId });
      return true;
    } catch (error) {
      logger.error('auth.logout.revoke_error', { error: (error as Error).message });
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
      logger.info('auth.logout_all.revoked_all', { userId });
      return true;
    } catch (error) {
      logger.error('auth.logout_all.revoke_all_error', { error: (error as Error).message, userId });
      return false;
    }
  }

  /**
   * Limpar tokens expirados
   */
  static async cleanExpiredTokens(): Promise<void> {
    try {
      // Remover tokens expirados e revogados da tabela refreshToken
      const result = await prisma.refreshToken.deleteMany({
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
      logger.info('auth.refresh.cleanup', { deleted: result.count });
    } catch (error) {
      logger.error('auth.refresh.cleanup_error', { error: (error as Error).message });
    }
  }
}

// Limpar tokens expirados a cada hora
setInterval(() => {
  JWTService.cleanExpiredTokens();
}, 60 * 60 * 1000);
