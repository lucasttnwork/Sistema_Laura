import express from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from './auth.service';
import { PERMISSION_CATALOG, ROLE_PERMISSION_MAP } from './permissions';
import { JWTService } from './jwt.service';
import { authenticateJWT, authRateLimit } from './auth.middleware';
import { PrismaClient } from '@prisma/client';
import { logger, createRequestLogger, authRequestCounter } from '@bmad/observability';

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting para rotas de autenticação
const loginLimiter = rateLimit(authRateLimit);

/**
 * POST /auth/register
 * Registrar novo usuário
 */
router.post('/register', loginLimiter, async (req, res) => {
  try {
    const result = await AuthService.register(req.body);
    const statusCode = result.success ? 201 : 400;
    logger.info('auth.route.register', { success: result.success });
    res.status(statusCode).json(result);
  } catch (error) {
    logger.error('auth.route.register_error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /auth/login
 * Login do usuário
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const result = await AuthService.login(req.body);
    const statusCode = result.success ? 200 : 401;

    // Se login bem-sucedido, configurar cookie seguro
    if (result.success && result.tokens) {
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      });
    }

    const reqLogger = createRequestLogger(logger, { requestId: (req as any).requestId, userId: result.user?.id });
    reqLogger.info('auth.route.login', { success: result.success });
    authRequestCounter.inc({ action: 'login', result: result.success ? 'success' : 'error' });
    res.status(statusCode).json(result);
  } catch (error) {
    const reqLogger = createRequestLogger(logger, { requestId: (req as any).requestId });
    reqLogger.error('auth.route.login_error', { error: (error as Error).message });
    authRequestCounter.inc({ action: 'login', result: 'error' });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /auth/logout
 * Logout do usuário
 */
router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      const reqLogger = createRequestLogger(logger, { requestId: (req as any).requestId, userId: (req as any).user?.userId });
      reqLogger.warn('auth.route.logout_missing_refresh');
      authRequestCounter.inc({ action: 'logout', result: 'error' });
      return res.status(400).json({
        success: false,
        error: 'Refresh token não fornecido',
      });
    }

    const result = await AuthService.logout(refreshToken);
    // Limpar cookie
    res.clearCookie('refreshToken');
    const reqLogger = createRequestLogger(logger, { requestId: (req as any).requestId, userId: (req as any).user?.userId });
    reqLogger.info('auth.route.logout', { success: result.success });
    authRequestCounter.inc({ action: 'logout', result: result.success ? 'success' : 'error' });
    res.json(result);
  } catch (error) {
    const reqLogger = createRequestLogger(logger, { requestId: (req as any).requestId, userId: (req as any).user?.userId });
    reqLogger.error('auth.route.logout_error', { error: (error as Error).message });
    authRequestCounter.inc({ action: 'logout', result: 'error' });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /auth/refresh
 * Renovar access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!refreshToken) {
      const reqLogger = createRequestLogger(logger, { requestId: (req as any).requestId, userId: (req as any).user?.userId });
      reqLogger.warn('auth.route.refresh_missing_refresh');
      authRequestCounter.inc({ action: 'refresh', result: 'error' });
      return res.status(400).json({
        success: false,
        error: 'Refresh token não fornecido',
      });
    }

    const result = await AuthService.refreshToken(refreshToken);
    const statusCode = result.success ? 200 : 401;

    // Atualizar cookie se necessário
    if (result.success && result.tokens) {
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      });
    }

    const reqLogger = createRequestLogger(logger, { requestId: (req as any).requestId, userId: result.user?.id || (req as any).user?.userId });
    reqLogger.info('auth.route.refresh', { success: result.success });
    authRequestCounter.inc({ action: 'refresh', result: result.success ? 'success' : 'error' });
    res.status(statusCode).json(result);
  } catch (error) {
    const reqLogger = createRequestLogger(logger, { requestId: (req as any).requestId, userId: (req as any).user?.userId });
    reqLogger.error('auth.route.refresh_error', { error: (error as Error).message });
    authRequestCounter.inc({ action: 'refresh', result: 'error' });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /auth/me
 * Obter dados do usuário autenticado
 */
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    // Buscar dados atualizados do usuário
    const usuario = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        nome: true,
        cargo: true,
        whatsapp: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
      });
    }

    // Calcular permissões baseado no cargo
    const permissions = ROLE_PERMISSION_MAP[usuario.cargo] || [];

    res.json({
      success: true,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        cargo: usuario.cargo,
        whatsapp: usuario.whatsapp,
        permissions: permissions,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
      },
    });
  } catch (error) {
    logger.error('auth.route.me_error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * POST /auth/logout-all
 * Logout de todas as sessões do usuário
 */
router.post('/logout-all', authenticateJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    const revoked = await JWTService.revokeAllUserTokens(req.user.userId);
    // Limpar cookie
    res.clearCookie('refreshToken');

    logger.info('auth.route.logout_all', { success: revoked });
    res.json({
      success: revoked,
      message: revoked
        ? 'Logout realizado de todas as sessões'
        : 'Erro ao fazer logout de todas as sessões',
    });
  } catch (error) {
    logger.error('auth.route.logout_all_error', { error: (error as Error).message });
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

/**
 * GET /auth/permissions
 * Listar permissões do usuário autenticado
 */
router.get('/permissions', authenticateJWT, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }

    res.json({
      success: true,
      user: {
        id: req.user.userId,
        cargo: req.user.cargo,
        permissions: req.user.permissions,
      },
      catalog: PERMISSION_CATALOG,
      roles: Object.keys(ROLE_PERMISSION_MAP),
    });
  } catch (error) {
    console.error('Erro no endpoint permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }
});

export default router;
