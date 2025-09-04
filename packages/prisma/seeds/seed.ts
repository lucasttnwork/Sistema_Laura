import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes em ordem de dependência
  console.log('🧹 Limpando dados existentes...');
  await prisma.pagamento.deleteMany({});
  await prisma.orcamento.deleteMany({});
  await prisma.pedido.deleteMany({});
  await prisma.score.deleteMany({});
  await prisma.fornecedor.deleteMany({});
  await prisma.obra.deleteMany({});
  await prisma.usuario.deleteMany({});

  // 1. Criar usuários (fiscais e supervisores)
  console.log('👥 Criando usuários...');
  const usuarios = await Promise.all([
    prisma.usuario.create({
      data: {
        nome: 'João Silva',
        cargo: 'Engenheiro Civil',
        whatsapp: '+5511999999001',
        permissions: {
          canCreatePedidos: true,
          canApprovePedidos: true,
          canViewReports: true,
          maxApprovalValue: 50000.0,
        },
      },
    }),
    prisma.usuario.create({
      data: {
        nome: 'Maria Santos',
        cargo: 'Fiscal de Obra',
        whatsapp: '+5511999999002',
        permissions: {
          canCreatePedidos: true,
          canApprovePedidos: false,
          canViewReports: true,
          maxApprovalValue: 10000.0,
        },
      },
    }),
    prisma.usuario.create({
      data: {
        nome: 'Carlos Oliveira',
        cargo: 'Mestre de Obra',
        whatsapp: '+5511999999003',
        permissions: {
          canCreatePedidos: true,
          canApprovePedidos: false,
          canViewReports: false,
          maxApprovalValue: 5000.0,
        },
      },
    }),
    prisma.usuario.create({
      data: {
        nome: 'Ana Costa',
        cargo: 'Gerente de Projetos',
        whatsapp: '+5511999999004',
        permissions: {
          canCreatePedidos: true,
          canApprovePedidos: true,
          canViewReports: true,
          maxApprovalValue: 100000.0,
        },
      },
    }),
  ]);
  console.log(`✅ ${usuarios.length} usuários criados`);

  // 2. Criar obras
  console.log('🏗️ Criando obras...');
  const obras = await Promise.all([
    prisma.obra.create({
      data: {
        nome: 'Edifício Residencial Paulista',
        endereco: 'Rua Augusta, 1500 - Consolação, São Paulo/SP',
        coordenadas: {
          lat: -23.5505,
          lng: -46.6333,
          address: 'Rua Augusta, 1500',
        },
        fiscalId: usuarios[0].id, // João Silva
      },
    }),
    prisma.obra.create({
      data: {
        nome: 'Centro Comercial Vila Madalena',
        endereco: 'Rua Harmonia, 800 - Vila Madalena, São Paulo/SP',
        coordenadas: {
          lat: -23.5489,
          lng: -46.6388,
          address: 'Rua Harmonia, 800',
        },
        fiscalId: usuarios[1].id, // Maria Santos
      },
    }),
    prisma.obra.create({
      data: {
        nome: 'Condomínio Jardim Europa',
        endereco: 'Alameda Jaú, 2000 - Jardim Europa, São Paulo/SP',
        coordenadas: {
          lat: -23.5729,
          lng: -46.6731,
          address: 'Alameda Jaú, 2000',
        },
        fiscalId: usuarios[3].id, // Ana Costa
      },
    }),
    prisma.obra.create({
      data: {
        nome: 'Galpão Industrial ABC',
        endereco: 'Av. Industrial, 5000 - Santo André/SP',
        coordenadas: {
          lat: -23.6821,
          lng: -46.582,
          address: 'Av. Industrial, 5000',
        },
        fiscalId: usuarios[2].id, // Carlos Oliveira
      },
    }),
  ]);
  console.log(`✅ ${obras.length} obras criadas`);

  // 3. Criar fornecedores
  console.log('🏢 Criando fornecedores...');
  const fornecedores = await Promise.all([
    // Categoria A - Premium
    prisma.fornecedor.create({
      data: {
        nome: 'Construtora Alpha Premium Ltda',
        cnpj: '11.222.333/0001-44',
        whatsapp: '+5511888888001',
        categoria: 'A',
        coordenadas: {
          lat: -23.54,
          lng: -46.63,
          address: 'Rua dos Materiais, 100',
        },
        ativo: true,
      },
    }),
    prisma.fornecedor.create({
      data: {
        nome: 'Materiais Excellence S.A.',
        cnpj: '22.333.444/0001-55',
        whatsapp: '+5511888888002',
        categoria: 'A',
        coordenadas: {
          lat: -23.56,
          lng: -46.65,
          address: 'Av. Construção, 500',
        },
        ativo: true,
      },
    }),
    // Categoria B - Bons
    prisma.fornecedor.create({
      data: {
        nome: 'Distribuidora Beta Construção',
        cnpj: '33.444.555/0001-66',
        whatsapp: '+5511888888003',
        categoria: 'B',
        coordenadas: {
          lat: -23.52,
          lng: -46.61,
          address: 'Rua do Comércio, 200',
        },
        ativo: true,
      },
    }),
    prisma.fornecedor.create({
      data: {
        nome: 'Materiais Gamma Ltda',
        cnpj: '44.555.666/0001-77',
        whatsapp: '+5511888888004',
        categoria: 'B',
        coordenadas: {
          lat: -23.58,
          lng: -46.67,
          address: 'Rua Industrial, 300',
        },
        ativo: true,
      },
    }),
    // Categoria C - Médios
    prisma.fornecedor.create({
      data: {
        nome: 'Fornecedora Delta ME',
        cnpj: '55.666.777/0001-88',
        whatsapp: '+5511888888005',
        categoria: 'C',
        coordenadas: {
          lat: -23.6,
          lng: -46.62,
          address: 'Av. dos Fornecedores, 400',
        },
        ativo: true,
      },
    }),
    // Categoria D - Novos
    prisma.fornecedor.create({
      data: {
        nome: 'Materiais Epsilon Ltda',
        cnpj: '66.777.888/0001-99',
        whatsapp: '+5511888888006',
        categoria: 'D',
        coordenadas: {
          lat: -23.53,
          lng: -46.64,
          address: 'Rua Nova, 150',
        },
        ativo: true,
      },
    }),
  ]);
  console.log(`✅ ${fornecedores.length} fornecedores criados`);

  // 4. Criar scores para os fornecedores
  console.log('📊 Criando scores dos fornecedores...');
  const scoresData = [
    // Alpha Premium (A) - Scores altos
    {
      fornecedorId: fornecedores[0].id,
      responseTime: 9.5,
      acceptance: 9.8,
      delivery: 9.2,
      price: 7.5,
      quality: 9.7,
    },
    // Excellence (A) - Scores altos
    {
      fornecedorId: fornecedores[1].id,
      responseTime: 9.2,
      acceptance: 9.5,
      delivery: 9.0,
      price: 8.0,
      quality: 9.4,
    },
    // Beta (B) - Scores bons
    {
      fornecedorId: fornecedores[2].id,
      responseTime: 8.0,
      acceptance: 8.5,
      delivery: 8.2,
      price: 8.5,
      quality: 8.0,
    },
    // Gamma (B) - Scores bons
    {
      fornecedorId: fornecedores[3].id,
      responseTime: 7.8,
      acceptance: 8.2,
      delivery: 8.0,
      price: 8.8,
      quality: 7.9,
    },
    // Delta (C) - Scores médios
    {
      fornecedorId: fornecedores[4].id,
      responseTime: 6.5,
      acceptance: 7.0,
      delivery: 6.8,
      price: 9.0,
      quality: 6.5,
    },
    // Epsilon (D) - Scores baixos (novo)
    {
      fornecedorId: fornecedores[5].id,
      responseTime: 5.0,
      acceptance: 5.0,
      delivery: 5.0,
      price: 9.5,
      quality: 5.0,
    },
  ];

  for (const scoreData of scoresData) {
    const totalScore =
      (scoreData.responseTime +
        scoreData.acceptance +
        scoreData.delivery +
        scoreData.price +
        scoreData.quality) /
      5;

    await prisma.score.create({
      data: {
        fornecedorId: scoreData.fornecedorId,
        responseTimeScore: scoreData.responseTime,
        acceptanceRateScore: scoreData.acceptance,
        deliveryScore: scoreData.delivery,
        priceScore: scoreData.price,
        qualityScore: scoreData.quality,
        totalScore: totalScore,
      },
    });
  }
  console.log(`✅ ${scoresData.length} scores criados`);

  // 5. Criar pedidos de exemplo
  console.log('📋 Criando pedidos de exemplo...');
  const pedidos = [];

  // Pedido 1 - Pendente
  const pedido1 = await prisma.pedido.create({
    data: {
      id: `PED-${obras[0].nome.split(' ')[1].toUpperCase()}-2025-001`,
      obraId: obras[0].id,
      fiscalId: usuarios[0].id,
      descricao: '100 sacos de cimento Portland CP II-E-32 + 50m³ de areia média lavada',
      status: 'PENDENTE',
      valorAprovado: null,
    },
  });
  pedidos.push(pedido1);

  // Pedido 2 - Em cotação
  const pedido2 = await prisma.pedido.create({
    data: {
      id: `PED-${obras[1].nome.split(' ')[1].toUpperCase()}-2025-002`,
      obraId: obras[1].id,
      fiscalId: usuarios[1].id,
      descricao: '200 blocos de concreto 14x19x39cm + 10 sacos de argamassa',
      status: 'COTANDO',
    },
  });
  pedidos.push(pedido2);

  // Pedido 3 - Aprovado
  const pedido3 = await prisma.pedido.create({
    data: {
      id: `PED-${obras[2].nome.split(' ')[1].toUpperCase()}-2025-003`,
      obraId: obras[2].id,
      fiscalId: usuarios[3].id,
      descricao: '50 telhas de fibrocimento + 20m de calha PVC',
      status: 'APROVADO',
      valorAprovado: 3500.0,
    },
  });
  pedidos.push(pedido3);

  console.log(`✅ ${pedidos.length} pedidos criados`);

  // 6. Criar orçamentos para os pedidos em cotação
  console.log('💰 Criando orçamentos...');
  const orcamentos = [];

  // Orçamentos para pedido 2 (em cotação)
  const fornecedoresParaCotacao = [fornecedores[0], fornecedores[1], fornecedores[2]]; // Top 3

  for (const fornecedor of fornecedoresParaCotacao) {
    const valorBase = 2000 + Math.random() * 1000; // Entre 2000 e 3000
    const orcamento = await prisma.orcamento.create({
      data: {
        pedidoId: pedido2.id,
        fornecedorId: fornecedor.id,
        valorUnitario: 10.0 + Math.random() * 5,
        valorTotal: valorBase,
        prazoEntrega: new Date(
          Date.now() + (5 + Math.floor(Math.random() * 10)) * 24 * 60 * 60 * 1000
        ),
        condicoes: {
          pagamento:
            fornecedor.categoria === 'A'
              ? 'À vista com 3% desconto ou 30 dias'
              : 'À vista ou 15 dias',
          entrega: 'Entrega inclusa na Grande São Paulo',
          garantia: fornecedor.categoria === 'A' ? '12 meses' : '6 meses',
          observacoes: `Orçamento válido por 15 dias - ${fornecedor.nome}`,
        },
        aprovado: false,
      },
    });
    orcamentos.push(orcamento);
  }

  // Orçamento aprovado para pedido 3
  const orcamentoAprovado = await prisma.orcamento.create({
    data: {
      pedidoId: pedido3.id,
      fornecedorId: fornecedores[0].id, // Alpha Premium
      valorUnitario: 70.0,
      valorTotal: 3500.0,
      prazoEntrega: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      condicoes: {
        pagamento: 'À vista com 3% desconto',
        entrega: 'Entrega expressa em 3 dias úteis',
        garantia: '24 meses',
        observacoes: 'Material premium com certificação ISO',
      },
      aprovado: true,
    },
  });
  orcamentos.push(orcamentoAprovado);

  console.log(`✅ ${orcamentos.length} orçamentos criados`);

  // 7. Criar pagamento para pedido aprovado
  console.log('💳 Criando pagamento...');
  const pagamento = await prisma.pagamento.create({
    data: {
      pedidoId: pedido3.id,
      comprovanteUrl: 'https://storage.exemplo.com/comprovantes/pag-2025-003.pdf',
      valor: 3395.0, // Valor com desconto à vista
      paidAt: new Date(),
    },
  });

  console.log('✅ Pagamento criado');

  // Estatísticas finais
  console.log('\n📈 Resumo do seed:');
  console.log(`👥 Usuários: ${usuarios.length}`);
  console.log(`🏗️ Obras: ${obras.length}`);
  console.log(`🏢 Fornecedores: ${fornecedores.length}`);
  console.log(`📊 Scores: ${scoresData.length}`);
  console.log(`📋 Pedidos: ${pedidos.length}`);
  console.log(`💰 Orçamentos: ${orcamentos.length}`);
  console.log(`💳 Pagamentos: 1`);

  console.log('\n🎉 Seed concluído com sucesso!');
}

main()
  .catch(e => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
