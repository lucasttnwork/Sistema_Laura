#!/usr/bin/env node
/**
 * Teste dos endpoints CRUD de Obras e Fornecedores da API Laura
 */

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:3001';

let accessToken = null; // Token será obtido durante o login

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

    if (accessToken) {
      options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

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

async function testHealth() {
  console.log('\n🔍 Testando health check...');
  try {
    const response = await makeRequest('GET', '/health');
    console.log(`✅ Status: ${response.statusCode}`);
    console.log(`📄 Resposta:`, response.data);
    return response.statusCode === 200;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔐 Fazendo login...');
  try {
    const response = await makeRequest('POST', '/auth/login', {
      whatsapp: '+5511999999999',
      password: 'Teste@123456'
    });

    console.log(`✅ Status: ${response.statusCode}`);
    if (response.data.success) {
      accessToken = response.data.accessToken;
      console.log(`🎫 Token obtido: ${accessToken.substring(0, 50)}...`);
      console.log(`👤 Usuário:`, response.data.user);
    } else {
      console.log(`❌ Erro no login:`, response.data.error);
    }
    return response.data.success;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

async function testMe() {
  console.log('\n👤 Testando endpoint /auth/me...');
  try {
    const response = await makeRequest('GET', '/auth/me');
    console.log(`✅ Status: ${response.statusCode}`);
    if (response.data.success) {
      console.log(`👤 Usuário autenticado:`, response.data.user);
    } else {
      console.log(`❌ Erro:`, response.data.error);
    }
    return response.data.success;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

// Testes de Obras
async function testCreateObra() {
  console.log('\n🏗️ Criando nova obra...');
  try {
    const response = await makeRequest('POST', '/api/obras', {
      nome: 'Condomínio Solar das Águas',
      fiscalId: '123456789'
    });

    console.log(`✅ Status: ${response.statusCode}`);
    if (response.data.success) {
      console.log(`🏗️ Obra criada:`, response.data.obra);
      return response.data.obra.id;
    } else {
      console.log(`❌ Erro:`, response.data.error);
      if (response.data.details) {
        console.log(`📋 Detalhes:`, response.data.details);
      }
    }
    return null;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return null;
  }
}

async function testListObras() {
  console.log('\n📋 Listando obras...');
  try {
    const response = await makeRequest('GET', '/api/obras');
    console.log(`✅ Status: ${response.statusCode}`);
    if (response.data.success) {
      console.log(`📊 Total de obras: ${response.data.total}`);
      console.log(`🏗️ Obras:`, response.data.obras);
    } else {
      console.log(`❌ Erro:`, response.data.error);
    }
    return response.data.success;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

async function testUpdateObra(obraId) {
  console.log('\n📝 Atualizando obra...');
  try {
    const response = await makeRequest('PUT', `/api/obras/${obraId}`, {
      nome: 'Condomínio Solar das Águas - Atualizado',
      status: 'ativo'
    });

    console.log(`✅ Status: ${response.statusCode}`);
    if (response.data.success) {
      console.log(`📝 Obra atualizada:`, response.data.obra);
    } else {
      console.log(`❌ Erro:`, response.data.error);
      if (response.data.details) {
        console.log(`📋 Detalhes:`, response.data.details);
      }
    }
    return response.data.success;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

async function testGetObra(obraId) {
  console.log('\n🔍 Buscando obra específica...');
  try {
    const response = await makeRequest('GET', `/api/obras/${obraId}`);
    console.log(`✅ Status: ${response.statusCode}`);
    if (response.data.success) {
      console.log(`🏗️ Obra encontrada:`, response.data.obra);
    } else {
      console.log(`❌ Erro:`, response.data.error);
    }
    return response.data.success;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

// Testes de Fornecedores
async function testCreateFornecedor() {
  console.log('\n🏭 Criando novo fornecedor...');
  try {
    const response = await makeRequest('POST', '/api/fornecedores', {
      nome: 'Construtora Silva Ltda',
      whatsapp: '+5511988887777',
      email: 'contato@silva.com.br',
      categoria: 'Construção Civil'
    });

    console.log(`✅ Status: ${response.statusCode}`);
    if (response.data.success) {
      console.log(`🏭 Fornecedor criado:`, response.data.fornecedor);
      return response.data.fornecedor.id;
    } else {
      console.log(`❌ Erro:`, response.data.error);
      if (response.data.details) {
        console.log(`📋 Detalhes:`, response.data.details);
      }
    }
    return null;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return null;
  }
}

async function testListFornecedores() {
  console.log('\n📋 Listando fornecedores...');
  try {
    const response = await makeRequest('GET', '/api/fornecedores');
    console.log(`✅ Status: ${response.statusCode}`);
    if (response.data.success) {
      console.log(`📊 Total de fornecedores: ${response.data.total || response.data.fornecedores.length}`);
      console.log(`🏭 Fornecedores:`, response.data.fornecedores);
    } else {
      console.log(`❌ Erro:`, response.data.error);
    }
    return response.data.success;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

async function testUpdateFornecedor(fornecedorId) {
  console.log('\n📝 Atualizando fornecedor...');
  try {
    const response = await makeRequest('PUT', `/api/fornecedores/${fornecedorId}`, {
      nome: 'Construtora Silva Ltda - Atualizado',
      categoria: 'Construção e Reforma'
    });

    console.log(`✅ Status: ${response.statusCode}`);
    if (response.data.success) {
      console.log(`📝 Fornecedor atualizado:`, response.data.fornecedor);
    } else {
      console.log(`❌ Erro:`, response.data.error);
      if (response.data.details) {
        console.log(`📋 Detalhes:`, response.data.details);
      }
    }
    return response.data.success;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

async function testGetFornecedor(fornecedorId) {
  console.log('\n🔍 Buscando fornecedor específico...');
  try {
    const response = await makeRequest('GET', `/api/fornecedores/${fornecedorId}`);
    console.log(`✅ Status: ${response.statusCode}`);
    if (response.data.success) {
      console.log(`🏭 Fornecedor encontrado:`, response.data.fornecedor);
    } else {
      console.log(`❌ Erro:`, response.data.error);
    }
    return response.data.success;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return false;
  }
}

// Teste de validação
async function testValidation() {
  console.log('\n🛡️ Testando validação Zod...');

  // Teste obra com dados inválidos
  console.log('\n📝 Testando criação de obra com dados inválidos...');
  const responseObra = await makeRequest('POST', '/api/obras', {
    nome: 'A', // Nome muito curto
    fiscalId: '12' // fiscalId muito curto
  });

  console.log(`✅ Status: ${responseObra.statusCode}`);
  if (responseObra.data.details) {
    console.log(`📋 Erros de validação:`, responseObra.data.details);
  }

  // Teste fornecedor com dados inválidos
  console.log('\n📝 Testando criação de fornecedor com dados inválidos...');
  const responseFornecedor = await makeRequest('POST', '/api/fornecedores', {
    nome: '', // Nome vazio
    whatsapp: '11999999999', // WhatsApp sem formato correto
    categoria: '' // Categoria vazia
  });

  console.log(`✅ Status: ${responseFornecedor.statusCode}`);
  if (responseFornecedor.data.details) {
    console.log(`📋 Erros de validação:`, responseFornecedor.data.details);
  }
}

// Função principal
async function runTests() {
  console.log('🚀 Iniciando testes da API Laura - Obras e Fornecedores');
  console.log('=' .repeat(60));

  // Testes básicos
  const healthOk = await testHealth();
  if (!healthOk) {
    console.log('\n❌ Servidor não está funcionando. Abortando testes.');
    process.exit(1);
  }

  const loginOk = await testLogin();
  if (!loginOk) {
    console.log('\n❌ Falha no login. Abortando testes.');
    process.exit(1);
  }

  await testMe();

  // Testes de Obras
  console.log('\n' + '='.repeat(60));
  console.log('🏗️ TESTES DE OBRAS');
  console.log('='.repeat(60));

  const obraId = await testCreateObra();
  await testListObras();

  if (obraId) {
    await testUpdateObra(obraId);
    await testGetObra(obraId);
  }

  // Testes de Fornecedores
  console.log('\n' + '='.repeat(60));
  console.log('🏭 TESTES DE FORNECEDORES');
  console.log('='.repeat(60));

  const fornecedorId = await testCreateFornecedor();
  await testListFornecedores();

  if (fornecedorId) {
    await testUpdateFornecedor(fornecedorId);
    await testGetFornecedor(fornecedorId);
  }

  // Testes de validação
  console.log('\n' + '='.repeat(60));
  console.log('🛡️ TESTES DE VALIDAÇÃO');
  console.log('='.repeat(60));

  await testValidation();

  console.log('\n' + '='.repeat(60));
  console.log('✅ Testes concluídos!');
  console.log('='.repeat(60));
}

// Executar testes
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, makeRequest };
