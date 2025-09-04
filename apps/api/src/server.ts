import express = require('express');
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

const app = express();
const prisma = new PrismaClient();

// Configuração Redis para filas
const redisConnection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null, // Required for BullMQ
});

// Filas
const pedidoQueue = new Queue('pedido-processing', { connection: redisConnection });

// Middleware para parsing JSON
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api' });
});

app.get('/db-check', async (_req, res) => {
  try {
    const now = await prisma.$queryRaw`SELECT NOW()`;
    res.json({ ok: true, now });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Endpoint para testar os novos modelos do schema
app.get('/schema-test', async (_req, res) => {
  try {
    // Testar se os modelos foram gerados corretamente
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
        'Usuario',
        'Obra',
        'Pedido',
        'Fornecedor',
        'Score',
        'Orcamento',
        'Pagamento',
      ],
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Endpoint para criar dados de exemplo
app.post('/seed-example', async (_req, res) => {
  try {
    // Criar um usuário exemplo
    const usuario = await prisma.usuario.create({
      data: {
        nome: 'João Silva',
        cargo: 'Fiscal de Obra',
        whatsapp: '+5511999999999',
      },
    });

    // Criar uma obra exemplo
    const obra = await prisma.obra.create({
      data: {
        nome: 'Construção Residencial ABC',
        endereco: 'Rua das Flores, 123 - São Paulo/SP',
        fiscalId: usuario.id,
      },
    });

    // Criar um fornecedor exemplo
    const fornecedor = await prisma.fornecedor.create({
      data: {
        nome: 'Materiais Construção Ltda',
        cnpj: '12.345.678/0001-90',
        whatsapp: '+5511888888888',
        categoria: 'B',
      },
    });

    res.json({
      ok: true,
      message: 'Dados de exemplo criados com sucesso',
      data: { usuario, obra, fornecedor },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Endpoint para testar o sistema de filas
app.post('/test-queue', async (req, res) => {
  try {
    // Criar um pedido de teste
    const pedidoId = `PED-TESTE-${Date.now()}`;

    // Buscar um usuário e obra existentes (ou usar dados de exemplo)
    const usuario = await prisma.usuario.findFirst();
    const obra = await prisma.obra.findFirst();

    if (!usuario || !obra) {
      return res.status(400).json({
        ok: false,
        error: 'Nenhum usuário ou obra encontrado. Execute /seed-example primeiro.',
      });
    }

    // Adicionar job à fila
    const job = await pedidoQueue.add('process-pedido', {
      pedidoId,
      obraId: obra.id,
      fiscalId: usuario.id,
      descricao: 'Teste de material - 100 sacos de cimento Portland',
    });

    res.json({
      ok: true,
      message: 'Job adicionado à fila com sucesso',
      jobId: job.id,
      pedidoId,
      queueInfo: {
        name: 'pedido-processing',
        waiting: await pedidoQueue.getWaiting().then(jobs => jobs.length),
        active: await pedidoQueue.getActive().then(jobs => jobs.length),
        completed: await pedidoQueue.getCompleted().then(jobs => jobs.length),
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Endpoint para testar operações CRUD completas
app.post('/test-crud', async (req, res) => {
  try {
    const testResults = [];

    // 1. Criar usuário de teste
    const usuario = await prisma.usuario.create({
      data: {
        nome: 'Maria Santos',
        cargo: 'Engenheira Civil',
        whatsapp: '+5511777777777',
        permissions: { canCreatePedidos: true, canApprovePedidos: false },
      },
    });
    testResults.push({ action: 'CREATE Usuario', success: true, id: usuario.id });

    // 2. Criar obra de teste
    const obra = await prisma.obra.create({
      data: {
        nome: 'Edifício Comercial XYZ',
        endereco: 'Av. Paulista, 1000 - São Paulo/SP',
        coordenadas: { lat: -23.5505, lng: -46.6333 },
        fiscalId: usuario.id,
      },
    });
    testResults.push({ action: 'CREATE Obra', success: true, id: obra.id });

    // 3. Criar fornecedores de teste
    const fornecedores = await Promise.all([
      prisma.fornecedor.create({
        data: {
          nome: 'Construtora Alpha Ltda',
          cnpj: '11.222.333/0001-44',
          whatsapp: '+5511666666666',
          categoria: 'A',
          coordenadas: { lat: -23.5489, lng: -46.6388 },
        },
      }),
      prisma.fornecedor.create({
        data: {
          nome: 'Materiais Beta ME',
          cnpj: '55.666.777/0001-88',
          whatsapp: '+5511555555555',
          categoria: 'B',
        },
      }),
    ]);
    testResults.push({ action: 'CREATE Fornecedores', success: true, count: fornecedores.length });

    // 4. Criar scores para os fornecedores
    for (const fornecedor of fornecedores) {
      await prisma.score.create({
        data: {
          fornecedorId: fornecedor.id,
          responseTimeScore: Math.random() * 10,
          acceptanceRateScore: Math.random() * 10,
          deliveryScore: Math.random() * 10,
          priceScore: Math.random() * 10,
          qualityScore: Math.random() * 10,
          totalScore: Math.random() * 10,
        },
      });
    }
    testResults.push({ action: 'CREATE Scores', success: true, count: fornecedores.length });

    // 5. Criar pedido de teste
    const pedidoId = `PED-${obra.nome.split(' ')[0]?.toUpperCase() || 'OBRA'}-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
    const pedido = await prisma.pedido.create({
      data: {
        id: pedidoId,
        obraId: obra.id,
        fiscalId: usuario.id,
        descricao: '50 sacos de cimento Portland + 20 m³ de areia média',
        status: 'PENDENTE',
        valorAprovado: 2500.0,
      },
    });
    testResults.push({ action: 'CREATE Pedido', success: true, id: pedido.id });

    // 6. Criar orçamentos de teste
    const orcamentos = [];
    for (const fornecedor of fornecedores) {
      const orcamento = await prisma.orcamento.create({
        data: {
          pedidoId: pedido.id,
          fornecedorId: fornecedor.id,
          valorUnitario: 50.0 + Math.random() * 20,
          valorTotal: 2000.0 + Math.random() * 1000,
          prazoEntrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
          condicoes: {
            pagamento: 'À vista com 5% desconto ou 30 dias',
            entrega: 'Entrega inclusa em SP',
            garantia: '6 meses',
          },
        },
      });
      orcamentos.push(orcamento);
    }
    testResults.push({ action: 'CREATE Orçamentos', success: true, count: orcamentos.length });

    // 7. Testar consultas com relacionamentos
    const pedidoCompleto = await prisma.pedido.findUnique({
      where: { id: pedido.id },
      include: {
        obra: true,
        fiscal: true,
        orcamentos: {
          include: {
            fornecedor: {
              include: {
                scores: { take: 1, orderBy: { calculatedAt: 'desc' } },
              },
            },
          },
        },
      },
    });
    testResults.push({
      action: 'READ Pedido Completo',
      success: true,
      hasRelations: !!pedidoCompleto,
    });

    // 8. Testar atualização
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { status: 'COTANDO' },
    });
    testResults.push({ action: 'UPDATE Pedido Status', success: true });

    res.json({
      ok: true,
      message: 'Testes CRUD executados com sucesso',
      results: testResults,
      testData: {
        usuario: usuario.id,
        obra: obra.id,
        pedido: pedido.id,
        fornecedores: fornecedores.map(f => f.id),
        orcamentos: orcamentos.map(o => o.id),
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err), stack: (err as Error).stack });
  }
});

// Endpoint para limpar dados de teste
app.delete('/test-cleanup', async (req, res) => {
  try {
    // Limpar em ordem devido às foreign keys
    await prisma.pagamento.deleteMany({});
    await prisma.orcamento.deleteMany({});
    await prisma.pedido.deleteMany({});
    await prisma.score.deleteMany({});
    await prisma.fornecedor.deleteMany({});
    await prisma.obra.deleteMany({});
    await prisma.usuario.deleteMany({});

    res.json({
      ok: true,
      message: 'Dados de teste removidos com sucesso',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Schema completo implementado - Laura 01 System`);
});
