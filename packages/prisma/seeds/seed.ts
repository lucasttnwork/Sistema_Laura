// Seed file for Sistema Laura
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('🌱 Iniciando seed do Sistema Laura...');

  // Hash das senhas
  const [lauraHash, joaoHash, mariaHash] = await Promise.all([
    hashPassword('laura123'),
    hashPassword('joao123'),
    hashPassword('maria123'),
  ]);

  // Criar usuários com permissões baseadas no cargo
  const usuarios = await Promise.all([
    prisma.user.upsert({
      where: { whatsapp: '+5511999999999' },
      update: {},
      create: {
        nome: 'Laura Silva',
        cargo: 'Compradora',
        whatsapp: '+5511999999999',
        password: lauraHash,
      },
    }),
    prisma.user.upsert({
      where: { whatsapp: '+5511988888888' },
      update: {},
      create: {
        nome: 'João Santos',
        cargo: 'Fiscal de Obra',
        whatsapp: '+5511988888888',
        password: joaoHash,
      },
    }),
    prisma.user.upsert({
      where: { whatsapp: '+5511977777777' },
      update: {},
      create: {
        nome: 'Maria Oliveira',
        cargo: 'Gerente de Projetos',
        whatsapp: '+5511977777777',
        password: mariaHash,
      },
    }),
  ]);

  console.log('✅ Usuários criados:', usuarios.length);

  // Criar obras
  const obras = await Promise.all([
    prisma.obra.create({
      data: {
        nome: 'Condomínio Parque das Flores',
        fiscalId: usuarios[1].id,
        status: 'ativo',
      },
    }),
    prisma.obra.create({
      data: {
        nome: 'Edifício Empresarial Centro',
        fiscalId: usuarios[1].id,
        status: 'ativo',
      },
    }),
    prisma.obra.create({
      data: {
        nome: 'Residencial Vista Verde',
        fiscalId: usuarios[1].id,
        status: 'ativo',
      },
    }),
  ]);

  console.log('✅ Obras criadas:', obras.length);

  // Criar fornecedores
  const fornecedores = await Promise.all([
    prisma.fornecedor.upsert({
      where: { whatsapp: '+5511966666666' },
      update: {},
      create: {
        nome: 'Construmater Ltda',
        whatsapp: '+5511966666666',
        email: 'contato@construmater.com.br',
        categoria: 'Materiais de Construção',
        status: 'ativo',
      },
    }),
    prisma.fornecedor.upsert({
      where: { whatsapp: '+5511955555555' },
      update: {},
      create: {
        nome: 'Cimento do Brasil S.A.',
        whatsapp: '+5511955555555',
        email: 'vendas@cimento-brasil.com.br',
        categoria: 'Cimento e Argamassa',
        status: 'ativo',
      },
    }),
    prisma.fornecedor.upsert({
      where: { whatsapp: '+5511944444444' },
      update: {},
      create: {
        nome: 'Aço & Ferro Ltda',
        whatsapp: '+5511944444444',
        email: 'comercial@acoferro.com.br',
        categoria: 'Aço e Ferro',
        status: 'ativo',
      },
    }),
    prisma.fornecedor.upsert({
      where: { whatsapp: '+5511933333333' },
      update: {},
      create: {
        nome: 'Telhas & Coberturas Nacional',
        whatsapp: '+5511933333333',
        email: 'vendas@telhasnacional.com.br',
        categoria: 'Telhas e Coberturas',
        status: 'ativo',
      },
    }),
  ]);

  console.log('✅ Fornecedores criados:', fornecedores.length);

  // Criar solicitações
  const solicitacoes = await Promise.all([
    prisma.solicitacao.create({
      data: {
        obraId: obras[0].id,
        item: 'Cimento CP-II 50kg',
        quantidade: '200',
        especificacoes: 'Cimento Portland tipo CP-II, ensacado de 50kg, para estrutura',
        status: 'pendente',
      },
    }),
    prisma.solicitacao.create({
      data: {
        obraId: obras[0].id,
        item: 'Vergalhão CA-50 8mm',
        quantidade: '500',
        especificacoes: 'Vergalhão de aço CA-50, diâmetro 8mm, para estrutura',
        status: 'pendente',
      },
    }),
    prisma.solicitacao.create({
      data: {
        obraId: obras[1].id,
        item: 'Telha Cerâmica Portuguesa',
        quantidade: '1000',
        especificacoes: 'Telha cerâmica tipo portuguesa, tamanho padrão',
        status: 'pendente',
      },
    }),
  ]);

  console.log('✅ Solicitações criadas:', solicitacoes.length);

  // Criar cotações
  const cotacoes = await Promise.all([
    prisma.cotacao.create({
      data: {
        solicitacaoId: solicitacoes[0].id,
        fornecedorId: fornecedores[1].id,
        obraId: obras[0].id,
        userId: usuarios[0].id,
        valorUnitario: 28.50,
        valorTotal: 5700.00,
        prazo: '15 dias úteis',
        pagamento: '30 dias após entrega',
        status: 'enviada',
      },
    }),
    prisma.cotacao.create({
      data: {
        solicitacaoId: solicitacoes[0].id,
        fornecedorId: fornecedores[0].id,
        obraId: obras[0].id,
        userId: usuarios[0].id,
        valorUnitario: 29.90,
        valorTotal: 5980.00,
        prazo: '10 dias úteis',
        pagamento: '28 dias após entrega',
        status: 'respondida',
      },
    }),
    prisma.cotacao.create({
      data: {
        solicitacaoId: solicitacoes[1].id,
        fornecedorId: fornecedores[2].id,
        obraId: obras[0].id,
        userId: usuarios[0].id,
        valorUnitario: 8.75,
        valorTotal: 4375.00,
        prazo: '20 dias úteis',
        pagamento: '35 dias após entrega',
        status: 'enviada',
      },
    }),
  ]);

  console.log('✅ Cotações criadas:', cotacoes.length);

  // Criar histórico para as cotações
  await Promise.all([
    prisma.historico.create({
      data: {
        cotacaoId: cotacoes[0].id,
        acao: 'Cotação enviada',
        descricao: 'Cotação enviada para fornecedor via WhatsApp',
      },
    }),
    prisma.historico.create({
      data: {
        cotacaoId: cotacoes[1].id,
        acao: 'Cotação respondida',
        descricao: 'Fornecedor respondeu à cotação com valor proposto',
      },
    }),
  ]);

  console.log('✅ Histórico criado');

  // Criar aprovações de exemplo
  await prisma.aprovacao.create({
    data: {
      userId: usuarios[2].id,
      cotacaoId: cotacoes[1].id,
      status: 'aprovado',
      comentario: 'Cotação aprovada dentro do orçamento previsto',
    },
  });

  console.log('✅ Aprovações criadas');

  // Criar notificações de exemplo
  await Promise.all([
    prisma.notificacao.create({
      data: {
        userId: usuarios[0].id,
        titulo: 'Nova cotação recebida',
        mensagem: 'Construmater Ltda respondeu à cotação de cimento',
        tipo: 'info',
      },
    }),
    prisma.notificacao.create({
      data: {
        userId: usuarios[1].id,
        titulo: 'Solicitação pendente',
        mensagem: 'Nova solicitação de materiais para Condomínio Parque das Flores',
        tipo: 'warning',
      },
    }),
  ]);

  console.log('✅ Notificações criadas');

  console.log('🎉 Seed do Sistema Laura concluído com sucesso!');
  console.log('');
  console.log('📊 Dados criados:');
  console.log(`   👥 Usuários: ${usuarios.length}`);
  console.log(`   🏗️  Obras: ${obras.length}`);
  console.log(`   🏪 Fornecedores: ${fornecedores.length}`);
  console.log(`   📋 Solicitações: ${solicitacoes.length}`);
  console.log(`   💰 Cotações: ${cotacoes.length}`);
  console.log('');
  console.log('🔐 Credenciais de teste:');
  console.log('   Laura Silva (Compradora): laura123');
  console.log('   João Santos (Fiscal): joao123');
  console.log('   Maria Oliveira (Gerente): maria123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
