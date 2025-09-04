import { Request, Response, NextFunction } from 'express';
import { JWTService, JWTPayload } from './jwt.service';
import { hasPermission as rbacHasPermission, canApproveValue as rbacCanApproveValue } from './permissions';

// Estender interface do Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Middleware de autenticação JWT
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso não fornecido',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Formato de token inválido',
        code: 'INVALID_TOKEN_FORMAT',
      });
    }

    const decoded = JWTService.verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Middleware de autorização por permissão
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const hasPermission = rbacHasPermission(req.user.permissions, permission as any);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: `Permissão '${permission}' necessária`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
        userCargo: req.user.cargo,
      });
    }

    next();
  };
};

/**
 * Middleware de autorização por cargo
 */
export const requireRole = (...allowedCargos: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userCargo = req.user.cargo.toLowerCase();
    const isAllowed = allowedCargos.some(cargo => cargo.toLowerCase() === userCargo);

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: `Cargo não autorizado. Cargos permitidos: ${allowedCargos.join(', ')}`,
        code: 'INSUFFICIENT_ROLE',
        required: allowedCargos,
        userCargo: req.user.cargo,
      });
    }

    next();
  };
};

/**
 * Middleware de autorização por valor
 */
export const requireApprovalValue = (value: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const canApprove = rbacCanApproveValue(req.user.permissions, value);

    if (!canApprove) {
      const maxValue = req.user.permissions?.maxApprovalValue || 0;
      return res.status(403).json({
        success: false,
        error: `Valor R$ ${value.toFixed(2)} excede limite de aprovação`,
        code: 'VALUE_EXCEEDS_LIMIT',
        maxApprovalValue: maxValue,
        requestedValue: value,
        userCargo: req.user.cargo,
      });
    }

    next();
  };
};

/**
 * Middleware opcional de autenticação (não falha se não autenticado)
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = JWTService.verifyAccessToken(token);
        if (decoded) {
          req.user = decoded;
        }
      }
    }
    
    next();
  } catch (error) {
    // Em caso de erro, continua sem autenticação
    next();
  }
};

/**
 * Middleware de rate limiting para autenticação
 */
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 tentativas por IP
  message: {
    success: false,
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
};
