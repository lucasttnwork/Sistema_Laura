import express from 'express';
import { initTracing, metricsRouter, registerDefaultMetrics } from '@bmad/observability';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import authRoutes from './auth/auth.routes';
import { authenticateJWT, requirePermission } from './auth/auth.middleware';

// Inicializar tracing antes de outros imports/uso pesado de libs
initTracing({ serviceName: 'bmad-api' });
registerDefaultMetrics();

export const app = express();
export const prisma = new PrismaClient();

// Configuração Redis para filas
const redisConnection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Filas
const pedidoQueue = new Queue('pedido-processing', { connection: redisConnection });

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

    const enumCheck = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'status_pedido';
    `;

    res.json({ 
      ok: true, 
      message: 'Schema completo implementado com sucesso',
      tables: tableCheck,
      statusPedidoEnum: enumCheck,
      modelsAvailable: [
        'Usuario', 'Obra', 'Pedido', 'Fornecedor', 
        'Score', 'Orcamento', 'Pagamento'
      ]
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.post('/protected/test-queue', authenticateJWT, requirePermission('canCreatePedidos'), async (req, res) => {
  try {
    const pedidoId = `PED-AUTH-${Date.now()}`;

    const usuario = await prisma.usuario.findFirst();
    const obra = await prisma.obra.findFirst();

    if (!usuario || !obra) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Nenhum usuário ou obra encontrado. Execute seed primeiro.' 
      });
    }

    const job = await pedidoQueue.add('process-pedido', {
      pedidoId,
      obraId: obra.id,
      fiscalId: req.user?.userId || usuario.id,
      descricao: 'Teste autenticado - 50 sacos de argamassa'
    });

    res.json({
      ok: true,
      message: 'Job autenticado adicionado à fila',
      jobId: job.id,
      pedidoId,
      user: req.user?.cargo,
      queueInfo: {
        name: 'pedido-processing',
        waiting: await pedidoQueue.getWaiting().then(jobs => jobs.length),
        active: await pedidoQueue.getActive().then(jobs => jobs.length),
        completed: await pedidoQueue.getCompleted().then(jobs => jobs.length)
      }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

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

    res.json({ success: true, message: 'Pedido aprovado com sucesso', pedido, approvedBy: req.user?.cargo });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ success: false, error: 'Erro interno do servidor', ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada' });
});

export default app;


