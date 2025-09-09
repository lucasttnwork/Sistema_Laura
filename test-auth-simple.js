#!/usr/bin/env node
/**
 * Teste simples de autenticação OpenRouter baseado na documentação oficial
 * @see https://openrouter.ai/docs/api-reference/authentication
 */

const https = require('https');

// Configuração baseada na documentação
const OPENROUTER_API_KEY = "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";

function testAuthentication(modelId, modelName) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: `Olá! Você é o modelo ${modelName}. Confirme que está funcionando respondendo apenas "Sim, ${modelName} funcionando!".`
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://kabatec.com/sistema-laura', // Opcional - para rankings
        'X-Title': 'Sistema Laura - Teste Auth', // Opcional - para rankings
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log(`\n🔍 Testando ${modelName}...`);
    console.log(`📡 Enviando para: https://${options.hostname}${options.path}`);
    console.log(`🔑 Usando API Key: ${OPENROUTER_API_KEY.substring(0, 20)}...`);

    const req = https.request(options, (res) => {
      console.log(`📊 Status HTTP: ${res.statusCode}`);

      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonResponse = JSON.parse(responseData);
            console.log('✅ Resposta bem-sucedida!');
            console.log('🤖 Modelo usado:', jsonResponse.model);
            console.log('💬 Resposta:', jsonResponse.choices[0].message.content);
            console.log('📈 Tokens usados:', jsonResponse.usage);
            resolve(jsonResponse);
          } else {
            console.log('❌ Erro na resposta:');
            console.log('Status:', res.statusCode);
            console.log('Resposta:', responseData);
            resolve({ error: true, status: res.statusCode, response: responseData });
          }
        } catch (error) {
          console.log('❌ Erro ao processar resposta JSON:');
          console.log('Resposta bruta:', responseData);
          resolve({ error: true, rawResponse: responseData });
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Erro na requisição HTTPS:');
      console.log(error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function runAuthenticationTests() {
  console.log('🚀 Teste de Autenticação OpenRouter - Sistema Laura');
  console.log('==================================================');
  console.log('📖 Baseado na documentação: https://openrouter.ai/docs/api-reference/authentication');
  console.log('');

  try {
    // Teste 1: Grok Code Fast 1
    await testAuthentication('x-ai/grok-code-fast-1', 'Grok Code Fast 1');

    // Teste 2: Qwen3 Max
    await testAuthentication('qwen/qwen3-max', 'Qwen3 Max');

    console.log('\n🎯 Todos os testes de autenticação foram executados!');
    console.log('📝 Verifique os resultados acima para confirmar se a autenticação está funcionando.');

  } catch (error) {
    console.log('\n❌ Erro geral nos testes:');
    console.log(error.message);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  runAuthenticationTests();
}

module.exports = { testAuthentication };
