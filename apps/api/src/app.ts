import express from 'express';
import { initTracing, registerDefaultMetrics, metricsRouter } from '@bmad/observability';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
// import { Queue } from 'bullmq';
// import Redis from 'ioredis';
import authRoutes from './auth/auth.routes';
import { authenticateJWT, requirePermission } from './auth/auth.middleware';

// Inicializar tracing antes de outros imports/uso pesado de libs
initTracing({ serviceName: 'bmad-api' });
registerDefaultMetrics();

export const app = express();
export const prisma = new PrismaClient();

// Configuração Redis para filas - temporariamente desabilitada
// const redisConnection = new Redis({
//   host: 'localhost',
//   port: 6379,
//   maxRetriesPerRequest: null,
// });

// Filas - temporariamente desabilitada
// const pedidoQueue = new Queue('pedido-processing', { connection: redisConnection });

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// Rate limiting geral
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS básico
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  next();
});

// Rotas públicas
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api', timestamp: new Date().toISOString() });
});

// Métricas
app.use(metricsRouter());

// Verificação de conexão com banco
app.get('/db-check', async (_req, res) => {
  try {
    const now = await prisma.$queryRaw`SELECT NOW()`;
    res.json({ ok: true, now });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Auth
app.use('/auth', authRoutes);

// Rotas protegidas
app.get('/protected/test', authenticateJWT, (req, res) => {
  res.json({
    success: true,
    message: 'Rota protegida acessada com sucesso',
    user: {
      id: req.user?.userId,
      cargo: req.user?.cargo,
      whatsapp: req.user?.whatsapp,
    },
  });
});

app.get('/protected/schema-test', authenticateJWT, async (_req, res) => {
  try {
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    // Verificar enums disponíveis no schema atual
    const enumCheck = await prisma.$queryRaw`
      SELECT
        pg_type.typname as enum_name,
        array_agg(pg_enum.enumlabel ORDER BY pg_enum.enumsortorder) as enum_values
      FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      GROUP BY pg_type.typname;
    `;

    res.json({
      ok: true,
      message: 'Schema atual implementado com sucesso',
      tables: tableCheck,
      enums: enumCheck,
      modelsAvailable: [
        'User', 'Obra', 'Solicitacao', 'Fornecedor',
        'Cotacao', 'Historico', 'Aprovacao', 'Arquivo',
        'RefreshToken', 'Notificacao', 'Mensagem'
      ],
      note: 'Schema migrado de Pedido para Solicitacao/Cotacao/Aprovacao'
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Rota de teste da fila - temporariamente desabilitada
// app.post('/protected/test-queue', authenticateJWT, requirePermission('canCreatePedidos'), async (req, res) => {
//   // Implementação temporariamente removida
// });

// ROTAS DE PEDIDO TEMPORARIAMENTE DESABILITADAS
// Estas rotas usam prisma.pedido que não existe no schema atual
// Refatoração será feita em task futura com Solicitacao/Cotacao/Aprovacao

/*
app.get('/protected/pedidos', authenticateJWT, requirePermission('canViewPedidos'), async (req, res) => {
  try {
    const pedidos = await prisma.pedido.findMany({
      include: {
        obra: true,
        fiscal: { select: { nome: true, cargo: true } },
        orcamentos: { include: { fornecedor: { select: { nome: true, categoria: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      success: true,
      pedidos,
      count: pedidos.length,
      user: req.user?.cargo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/protected/pedidos/:id/approve', authenticateJWT, requirePermission('canApprovePedidos'), async (req, res) => {
  try {
    const pedidoId = req.params.id;
    const { valor } = req.body;

    const maxApproval = req.user?.permissions?.maxApprovalValue || 0;
    if (valor > maxApproval) {
      return res.status(403).json({
        success: false,
        error: `Valor R$ ${valor} excede seu limite de aprovação (R$ ${maxApproval})`,
        maxApprovalValue: maxApproval,
        userCargo: req.user?.cargo
      });
    }

    const pedido = await prisma.pedido.update({
      where: { id: pedidoId },
      data: { status: 'APROVADO', valorAprovado: valor }
    });

    res.json({
      success: true,
      message: 'Pedido aprovado com sucesso',
      pedido,
      approvedBy: req.user?.cargo
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});
*/

// ROTAS SUBSTITUTAS TEMPORÁRIAS PARA MANTER API FUNCIONAL
// Estas rotas usam as entidades do schema atual: Solicitacao/Cotacao/Aprovacao

app.get('/protected/solicitacoes', authenticateJWT, requirePermission('canViewPedidos'), async (req, res) => {
  try {
    const solicitacoes = await prisma.solicitacao.findMany({
      include: {
        obra: true,
        cotações: {
          include: {
            fornecedor: { select: { nome: true, categoria: true } },
            aprovacoes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({
      success: true,
      solicitacoes,
      count: solicitacoes.length,
      user: req.user?.cargo,
      note: 'Esta é uma rota temporária usando Solicitacao/Cotacao em vez de Pedido'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

app.post('/protected/cotacoes/:id/aprovar', authenticateJWT, requirePermission('canApprovePedidos'), async (req, res) => {
  try {
    const cotacaoId = req.params.id;
    const { valor, comentario } = req.body;

    // Verificar se já existe aprovação para esta cotação por este usuário
    const existingApproval = await prisma.aprovacao.findFirst({
      where: {
        cotacaoId: cotacaoId,
        userId: req.user?.userId
      }
    });

    if (existingApproval) {
      return res.status(400).json({
        success: false,
        error: 'Você já registrou uma aprovação para esta cotação'
      });
    }

    const aprovacao = await prisma.aprovacao.create({
      data: {
        cotacaoId: cotacaoId,
        userId: req.user?.userId || '',
        status: 'APROVADO',
        comentario: comentario || 'Aprovado via API'
      },
      include: {
        cotacao: {
          include: {
            solicitacao: true,
            fornecedor: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Cotação aprovada com sucesso',
      aprovacao,
      approvedBy: req.user?.cargo,
      note: 'Esta é uma aprovação temporária usando Aprovacao/Cotacao em vez de Pedido'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada' });
});

export default app;
