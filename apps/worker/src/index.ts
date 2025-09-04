import { Worker, Queue, Job } from 'bullmq';
import { initTracing, startMetricsServer, registerDefaultMetrics } from '@bmad/observability';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';

// Tracing & métricas
initTracing({ serviceName: 'bmad-worker' });
registerDefaultMetrics();
startMetricsServer(3002);

// Configuração do Redis
const redisConnection = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null, // Required for BullMQ
});

// Cliente Prisma
const prisma = new PrismaClient();

// Definição dos tipos de jobs
interface PedidoJob {
  pedidoId: string;
  obraId: string;
  fiscalId: string;
  descricao: string;
}

interface CotacaoJob {
  pedidoId: string;
  fornecedorIds: string[];
}

interface NotificationJob {
  type: 'whatsapp' | 'email' | 'sms';
  recipient: string;
  message: string;
  pedidoId?: string;
}

// Filas
const pedidoQueue = new Queue('pedido-processing', { connection: redisConnection });
const cotacaoQueue = new Queue('cotacao-processing', { connection: redisConnection });
const notificationQueue = new Queue('notification-processing', { connection: redisConnection });

// Worker para processamento de pedidos
const pedidoWorker = new Worker(
  'pedido-processing',
  async (job: Job<PedidoJob>) => {
    console.log(`🔄 Processando pedido: ${job.data.pedidoId}`);

    try {
      // 1. Validar e criar o pedido no banco
      const pedido = await prisma.pedido.create({
        data: {
          id: job.data.pedidoId,
          obraId: job.data.obraId,
          fiscalId: job.data.fiscalId,
          descricao: job.data.descricao,
          status: 'COTANDO',
        },
        include: {
          obra: true,
          fiscal: true,
        },
      });

      console.log(`✅ Pedido criado: ${pedido.id}`);

      // 2. Selecionar fornecedores baseado na localização da obra
      const fornecedores = await prisma.fornecedor.findMany({
        where: {
          ativo: true,
          categoria: {
            in: ['A', 'B', 'C'], // Priorizar fornecedores com boas classificações
          },
        },
        include: {
          scores: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
          },
        },
        take: 3, // Selecionar top 3 fornecedores
      });

      console.log(`📋 Selecionados ${fornecedores.length} fornecedores`);

      // 3. Enviar para fila de cotação
      if (fornecedores.length > 0) {
        await cotacaoQueue.add('send-cotacao-requests', {
          pedidoId: pedido.id,
          fornecedorIds: fornecedores.map((f: any) => f.id),
        });
      }

      // 4. Notificar fiscal sobre início do processo
      await notificationQueue.add('send-notification', {
        type: 'whatsapp',
        recipient: pedido.fiscal.whatsapp,
        message: `🏗️ Pedido ${pedido.id} criado com sucesso! Enviando para ${fornecedores.length} fornecedores.`,
        pedidoId: pedido.id,
      });

      return { success: true, pedidoId: pedido.id, fornecedoresCount: fornecedores.length };
    } catch (error) {
      console.error(`❌ Erro ao processar pedido ${job.data.pedidoId}:`, error);
      throw error;
    }
  },
  { connection: redisConnection }
);

// Worker para processamento de cotações
const cotacaoWorker = new Worker(
  'cotacao-processing',
  async (job: Job<CotacaoJob>) => {
    console.log(`💰 Enviando cotações para pedido: ${job.data.pedidoId}`);

    try {
      const pedido = await prisma.pedido.findUnique({
        where: { id: job.data.pedidoId },
        include: { obra: true },
      });

      if (!pedido) {
        throw new Error(`Pedido ${job.data.pedidoId} não encontrado`);
      }

      // Enviar solicitações para cada fornecedor
      for (const fornecedorId of job.data.fornecedorIds) {
        const fornecedor = await prisma.fornecedor.findUnique({
          where: { id: fornecedorId },
        });

        if (fornecedor) {
          // Simular envio via WhatsApp (em produção seria integração real)
          console.log(
            `📱 Enviando cotação via WhatsApp para ${fornecedor.nome} (${fornecedor.whatsapp})`
          );

          // Adicionar notificação para o fornecedor
          await notificationQueue.add('send-notification', {
            type: 'whatsapp',
            recipient: fornecedor.whatsapp,
            message: `🏗️ Nova solicitação de cotação!\n\nPedido: ${pedido.id}\nObra: ${pedido.obra.nome}\nDescrição: ${pedido.descricao}\n\nPor favor, envie sua cotação em até 4 horas.`,
            pedidoId: pedido.id,
          });
        }
      }

      return { success: true, fornecedoresNotificados: job.data.fornecedorIds.length };
    } catch (error) {
      console.error(`❌ Erro ao enviar cotações:`, error);
      throw error;
    }
  },
  { connection: redisConnection }
);

// Worker para notificações
const notificationWorker = new Worker(
  'notification-processing',
  async (job: Job<NotificationJob>) => {
    console.log(`📨 Enviando notificação ${job.data.type} para ${job.data.recipient}`);

    try {
      // Em produção, aqui seria a integração real com WhatsApp Business API, email, etc.
      switch (job.data.type) {
        case 'whatsapp':
          console.log(`📱 WhatsApp para ${job.data.recipient}: ${job.data.message}`);
          break;
        case 'email':
          console.log(`📧 Email para ${job.data.recipient}: ${job.data.message}`);
          break;
        case 'sms':
          console.log(`📲 SMS para ${job.data.recipient}: ${job.data.message}`);
          break;
      }

      // Simular delay de envio
      await new Promise(resolve => setTimeout(resolve, 1000));

      return { success: true, type: job.data.type, recipient: job.data.recipient };
    } catch (error) {
      console.error(`❌ Erro ao enviar notificação:`, error);
      throw error;
    }
  },
  { connection: redisConnection }
);

// Event listeners para monitoramento
pedidoWorker.on('completed', job => {
  console.log(`✅ Pedido job ${job.id} concluído`);
});

pedidoWorker.on('failed', (job, err) => {
  console.error(`❌ Pedido job ${job?.id} falhou:`, err.message);
});

cotacaoWorker.on('completed', job => {
  console.log(`✅ Cotação job ${job.id} concluído`);
});

notificationWorker.on('completed', job => {
  console.log(`✅ Notificação job ${job.id} concluído`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Encerrando workers...');
  await pedidoWorker.close();
  await cotacaoWorker.close();
  await notificationWorker.close();
  await prisma.$disconnect();
  await redisConnection.quit();
  process.exit(0);
});

console.log('🚀 BMAD Worker iniciado!');
console.log('📋 Filas ativas:');
console.log('  - pedido-processing');
console.log('  - cotacao-processing');
console.log('  - notification-processing');
console.log('🔗 Conectado ao Redis em localhost:6379');
console.log('🗄️  Conectado ao PostgreSQL via Prisma');

// Exportar filas para uso em outros módulos
export { pedidoQueue, cotacaoQueue, notificationQueue };
