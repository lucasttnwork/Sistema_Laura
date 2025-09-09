#!/usr/bin/env node
/**
 * Teste dos endpoints de autenticação e CRUD da API Laura
 * Inclui testes para solicitações e cotações
 */

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:3001';

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    }

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonResponse,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testAuthEndpoints() {
  console.log('🚀 Teste dos Endpoints de Autenticação - Sistema Laura');
  console.log('======================================================');
  console.log('');

  try {
    // Teste 1: Health Check
    console.log('1️⃣ Testando Health Check...');
    const healthResponse = await makeRequest('GET', '/health');
    console.log(`📊 Status: ${healthResponse.statusCode}`);
    console.log(`📄 Resposta:`, healthResponse.data);
    console.log('');

    // Teste 2: Registro de usuário
    console.log('2️⃣ Testando Registro de Usuário...');
    const registerData = {
      nome: 'João Silva',
      cargo: 'Fiscal de Obra',
      whatsapp: '+5511999999999',
      password: 'senha123456',
    };
    console.log('📝 Dados de registro:', registerData);

    const registerResponse = await makeRequest('POST', '/auth/register', registerData);
    console.log(`📊 Status: ${registerResponse.statusCode}`);
    console.log(`📄 Resposta:`, registerResponse.data);

    if (registerResponse.statusCode === 201) {
      console.log('✅ Registro bem-sucedido!');
    } else {
      console.log('❌ Erro no registro');
    }
    console.log('');

    // Teste 3: Login
    console.log('3️⃣ Testando Login...');
    const loginData = {
      whatsapp: '+5511999999999',
      password: 'senha123456',
    };
    console.log('🔐 Dados de login:', loginData);

    const loginResponse = await makeRequest('POST', '/auth/login', loginData);
    console.log(`📊 Status: ${loginResponse.statusCode}`);
    console.log(`📄 Resposta:`, loginResponse.data);

    let accessToken = null;
    let refreshToken = null;

    if (loginResponse.statusCode === 200 && loginResponse.data.success) {
      console.log('✅ Login bem-sucedido!');
      accessToken = loginResponse.data.tokens?.accessToken;
      refreshToken = loginResponse.data.tokens?.refreshToken;
      console.log('🔑 Access Token obtido');
      console.log('🔄 Refresh Token obtido');
    } else {
      console.log('❌ Erro no login');
    }
    console.log('');

    // Teste 4: Endpoint protegido (se temos token)
    if (accessToken) {
      console.log('4️⃣ Testando Endpoint Protegido...');
      const protectedResponse = await makeRequest(
        'GET',
        '/protected/test',
        null,
        {
          'Authorization': `Bearer ${accessToken}`,
        }
      );
      console.log(`📊 Status: ${protectedResponse.statusCode}`);
      console.log(`📄 Resposta:`, protectedResponse.data);

      if (protectedResponse.statusCode === 200) {
        console.log('✅ Acesso autorizado!');
      } else {
        console.log('❌ Acesso negado');
      }
      console.log('');

      // Teste 5: Obter dados do usuário
      console.log('5️⃣ Testando Endpoint /auth/me...');
      const meResponse = await makeRequest(
        'GET',
        '/auth/me',
        null,
        {
          'Authorization': `Bearer ${accessToken}`,
        }
      );
      console.log(`📊 Status: ${meResponse.statusCode}`);
      console.log(`📄 Resposta:`, meResponse.data);

      if (meResponse.statusCode === 200) {
        console.log('✅ Dados do usuário obtidos!');
      } else {
        console.log('❌ Erro ao obter dados do usuário');
      }
      console.log('');

      // Teste 6: Refresh token
      if (refreshToken) {
        console.log('6️⃣ Testando Refresh Token...');
        const refreshResponse = await makeRequest('POST', '/auth/refresh', { refreshToken });
        console.log(`📊 Status: ${refreshResponse.statusCode}`);
        console.log(`📄 Resposta:`, refreshResponse.data);

        if (refreshResponse.statusCode === 200) {
          console.log('✅ Token renovado!');
          accessToken = refreshResponse.data.tokens?.accessToken;
        } else {
          console.log('❌ Erro na renovação do token');
        }
        console.log('');
      }
    }

    // Teste 7: Logout
    if (refreshToken) {
      console.log('7️⃣ Testando Logout...');
      const logoutResponse = await makeRequest('POST', '/auth/logout', { refreshToken });
      console.log(`📊 Status: ${logoutResponse.statusCode}`);
      console.log(`📄 Resposta:`, logoutResponse.data);

      if (logoutResponse.statusCode === 200) {
        console.log('✅ Logout realizado!');
      } else {
        console.log('❌ Erro no logout');
      }
      console.log('');
    }

    console.log('🎯 Todos os testes foram executados!');
    console.log('📝 Verifique os resultados acima para o status da autenticação.');

  } catch (error) {
    console.log('\n❌ Erro geral nos testes:');
    console.log(error.message);
    console.log(error.stack);
  }
}

// Teste dos novos endpoints de solicitações e cotações
async function testSolicitacoesCotacoes() {
  console.log('\n🧪 TESTANDO ENDPOINTS DE SOLICITAÇÕES E COTAÇÕES');
  console.log('='.repeat(60));

  let authToken = null;
  let obraId = null;
  let fornecedorId = null;
  let solicitacaoId = null;
  let cotacaoId = null;

  try {
    // 1. Login para obter token
    console.log('\n1️⃣ Fazendo login...');
    const loginResponse = await makeRequest('POST', '/auth/login', {
      whatsapp: '+5511999999999',
      password: '123456'
    });

    if (loginResponse.statusCode === 200 && loginResponse.data.success) {
      authToken = loginResponse.data.token;
      console.log('✅ Login realizado com sucesso');
    } else {
      console.log('❌ Falha no login:', loginResponse.data?.error || 'Resposta inválida');
      return;
    }

    // Headers para requisições autenticadas
    const authHeaders = { 'Authorization': `Bearer ${authToken}` };

    // 2. Obter IDs necessários
    console.log('\n2️⃣ Obtendo IDs de obra e fornecedor...');

    // Buscar obra
    const obrasResponse = await makeRequest('GET', '/api/obras', null, authHeaders);
    if (obrasResponse.statusCode === 200 && obrasResponse.data.success) {
      obraId = obrasResponse.data.obras[0]?.id;
      console.log(`✅ Obra encontrada: ${obrasResponse.data.obras[0]?.nome}`);
    }

    // Buscar fornecedor
    const fornecedoresResponse = await makeRequest('GET', '/api/fornecedores', null, authHeaders);
    if (fornecedoresResponse.statusCode === 200 && fornecedoresResponse.data.success) {
      fornecedorId = fornecedoresResponse.data.fornecedores[0]?.id;
      console.log(`✅ Fornecedor encontrado: ${fornecedoresResponse.data.fornecedores[0]?.nome}`);
    }

    if (!obraId || !fornecedorId) {
      console.log('❌ Não foi possível obter IDs necessários para os testes');
      return;
    }

    // 3. Testar CRUD de Solicitações
    console.log('\n3️⃣ TESTANDO CRUD DE SOLICITAÇÕES');

    // Criar solicitação
    console.log('  📝 Criando solicitação...');
    const createSolicitacaoResponse = await makeRequest('POST', '/api/solicitacoes', {
      obraId,
      item: 'Cimento Portland 25kg',
      quantidade: '100 sacos',
      especificacoes: 'Cimento para contrapiso - resistência 25MPa'
    }, authHeaders);

    if (createSolicitacaoResponse.statusCode === 201) {
      solicitacaoId = createSolicitacaoResponse.data.solicitacao.id;
      console.log('  ✅ Solicitação criada:', createSolicitacaoResponse.data.solicitacao.item);
    } else {
      console.log('  ❌ Falha ao criar solicitação:', createSolicitacaoResponse.data?.error);
    }

    if (solicitacaoId) {
      // Listar solicitações
      console.log('  📋 Listando solicitações...');
      const listSolicitacoesResponse = await makeRequest('GET', '/api/solicitacoes', null, authHeaders);
      console.log(`  ✅ ${listSolicitacoesResponse.data?.solicitacoes?.length || 0} solicitações encontradas`);

      // Buscar solicitação específica
      console.log('  🔍 Buscando solicitação específica...');
      const getSolicitacaoResponse = await makeRequest('GET', `/api/solicitacoes/${solicitacaoId}`, null, authHeaders);
      console.log(`  ✅ Solicitação encontrada: ${getSolicitacaoResponse.data?.solicitacao?.item}`);

      // 4. Testar Sistema de Distribuição
      console.log('\n4️⃣ TESTANDO SISTEMA DE DISTRIBUIÇÃO');

      console.log('  📤 Distribuindo cotação para fornecedores...');
      const distribuirResponse = await makeRequest('POST', `/api/solicitacoes/${solicitacaoId}/distribuir`, {
        fornecedoresIds: [fornecedorId]
      }, authHeaders);

      if (distribuirResponse.statusCode === 200) {
        console.log(`  ✅ Cotação distribuída: ${distribuirResponse.data.message}`);
      } else {
        console.log('  ❌ Falha na distribuição:', distribuirResponse.data?.error);
      }

      // 5. Testar CRUD de Cotações
      console.log('\n5️⃣ TESTANDO CRUD DE COTAÇÕES');

      // Criar cotação
      console.log('  💰 Criando cotação...');
      const createCotacaoResponse = await makeRequest('POST', '/api/cotacoes', {
        solicitacaoId,
        fornecedorId,
        valorUnitario: 25.50,
        valorTotal: 2550.00,
        prazo: '15 dias úteis',
        pagamento: '30 dias após entrega'
      }, authHeaders);

      if (createCotacaoResponse.statusCode === 201) {
        cotacaoId = createCotacaoResponse.data.cotacao.id;
        console.log('  ✅ Cotação criada:', `R$ ${createCotacaoResponse.data.cotacao.valorTotal}`);
      } else {
        console.log('  ❌ Falha ao criar cotação:', createCotacaoResponse.data?.error);
      }

      if (cotacaoId) {
        // Listar cotações
        console.log('  📋 Listando cotações...');
        const listCotacoesResponse = await makeRequest('GET', '/api/cotacoes', null, authHeaders);
        console.log(`  ✅ ${listCotacoesResponse.data?.cotacoes?.length || 0} cotações encontradas`);

        // Buscar cotação específica
        console.log('  🔍 Buscando cotação específica...');
        const getCotacaoResponse = await makeRequest('GET', `/api/cotacoes/${cotacaoId}`, null, authHeaders);
        console.log(`  ✅ Cotação encontrada: R$ ${getCotacaoResponse.data?.cotacao?.valorTotal}`);

        // Ver cotações da solicitação
        console.log('  📊 Verificando cotações da solicitação...');
        const cotacoesSolicitacaoResponse = await makeRequest('GET', `/api/solicitacoes/${solicitacaoId}/cotacoes`, null, authHeaders);
        if (cotacoesSolicitacaoResponse.statusCode === 200) {
          const stats = cotacoesSolicitacaoResponse.data.estatisticas;
          console.log(`  ✅ Estatísticas: ${stats.total} cotações, R$ ${stats.valorMinimo} - R$ ${stats.valorMaximo}`);
        }

        // Testar resposta do fornecedor
        console.log('  📝 Testando resposta do fornecedor...');
        const responderResponse = await makeRequest('POST', `/api/cotacoes/${cotacaoId}/responder`, {
          valorUnitario: 24.80,
          valorTotal: 2480.00,
          prazo: '12 dias úteis',
          pagamento: '28 dias após entrega',
          comentario: 'Preço especial para grande quantidade'
        }, authHeaders);

        if (responderResponse.statusCode === 200) {
          console.log('  ✅ Resposta do fornecedor registrada');
        } else {
          console.log('  ❌ Falha na resposta:', responderResponse.data?.error);
        }

        // Testar aprovação de cotação
        console.log('  ✅ Testando aprovação de cotação...');
        const aprovarResponse = await makeRequest('POST', `/api/cotacoes/${cotacaoId}/approve`, {
          comentario: 'Aprovado - melhor preço do mercado'
        }, authHeaders);

        if (aprovarResponse.statusCode === 200) {
          console.log('  ✅ Cotação aprovada');
        } else {
          console.log('  ❌ Falha na aprovação:', aprovarResponse.data?.error);
        }

        // Limpeza - deletar cotação
        console.log('  🗑️  Removendo cotação de teste...');
        const deleteCotacaoResponse = await makeRequest('DELETE', `/api/cotacoes/${cotacaoId}`, null, authHeaders);
        console.log(deleteCotacaoResponse.statusCode === 200 ? '  ✅ Cotação removida' : '  ❌ Falha ao remover cotação');
      }

      // Limpeza - deletar solicitação
      console.log('  🗑️  Removendo solicitação de teste...');
      const deleteSolicitacaoResponse = await makeRequest('DELETE', `/api/solicitacoes/${solicitacaoId}`, null, authHeaders);
      console.log(deleteSolicitacaoResponse.statusCode === 200 ? '  ✅ Solicitação removida' : '  ❌ Falha ao remover solicitação');
    }

    console.log('\n🎯 Testes de Solicitações e Cotações concluídos!');
    console.log('📝 Verifique os resultados acima para o status dos novos endpoints.');

  } catch (error) {
    console.log('\n❌ Erro nos testes de solicitações e cotações:');
    console.log(error.message);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  // Executar testes de autenticação primeiro
  testAuthEndpoints().then(() => {
    // Depois executar testes dos novos endpoints
    setTimeout(() => {
      testSolicitacoesCotacoes();
    }, 1000);
  });
}

module.exports = { testAuthEndpoints, makeRequest };
