import express from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from './auth.service';
import { PERMISSION_CATALOG, ROLE_PERMISSION_MAP } from './permissions';
import { JWTService } from './jwt.service';
import { authenticateJWT, authRateLimit } from './auth.middleware';

const router = express.Router();

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
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('Erro no endpoint register:', error);
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
    
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('Erro no endpoint login:', error);
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
      return res.status(400).json({
        success: false,
        error: 'Refresh token não fornecido',
      });
    }

    const result = await AuthService.logout(refreshToken);
    
    // Limpar cookie
    res.clearCookie('refreshToken');
    
    res.json(result);
  } catch (error) {
    console.error('Erro no endpoint logout:', error);
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
    
    res.status(statusCode).json(result);
  } catch (error) {
    console.error('Erro no endpoint refresh:', error);
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
    const prisma = new (require('@prisma/client').PrismaClient)();
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        nome: true,
        cargo: true,
        whatsapp: true,
        permissions: true,
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

    res.json({
      success: true,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        cargo: usuario.cargo,
        whatsapp: usuario.whatsapp,
        permissions: usuario.permissions,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
      },
    });
  } catch (error) {
    console.error('Erro no endpoint me:', error);
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
    
    res.json({
      success: revoked,
      message: revoked 
        ? 'Logout realizado de todas as sessões' 
        : 'Erro ao fazer logout de todas as sessões',
    });
  } catch (error) {
    console.error('Erro no endpoint logout-all:', error);
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
