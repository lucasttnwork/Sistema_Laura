const https = require('https');

const testGrokModel = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: "x-ai/grok-code-fast-1",
      messages: [
        {
          role: "user",
          content: "Olá! Você está funcionando? Responda apenas com 'Sim, estou funcionando perfeitamente!'"
        }
      ],
      // Parâmetros opcionais conforme documentação
      max_tokens: 1000, // Limitar resposta para teste
      temperature: 0.1, // Baixa temperatura para respostas consistentes
      user: "sistema-laura-test" // Identificador do usuário para rastreamento
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        // Headers opcionais para atribuição de app (conforme documentação)
        'HTTP-Referer': 'https://kabatec.com/sistema-laura',
        'X-Title': 'Sistema Laura - Teste OpenRouter'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
};

const testQwenModel = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: "qwen/qwen3-max",
      messages: [
        {
          role: "user",
          content: "Olá! Você está funcionando? Responda apenas com 'Sim, estou funcionando perfeitamente!'"
        }
      ],
      // Parâmetros opcionais conforme documentação
      max_tokens: 1000, // Limitar resposta para teste
      temperature: 0.1, // Baixa temperatura para respostas consistentes
      user: "sistema-laura-test" // Identificador do usuário para rastreamento
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer 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',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        // Headers opcionais para atribuição de app (conforme documentação)
        'HTTP-Referer': 'https://kabatec.com/sistema-laura',
        'X-Title': 'Sistema Laura - Teste OpenRouter'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers);

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
};

// Executar testes
async function runTests() {
  console.log('🚀 Testando configuração da OpenRouter...\n');

  try {
    console.log('📝 Testando modelo Grok Code Fast 1:');
    console.log('=' .repeat(50));
    const grokResult = await testGrokModel();
    console.log('✅ Resposta do Grok:');
    console.log(JSON.stringify(grokResult, null, 2));
    console.log('\n');

    console.log('📝 Testando modelo Qwen3 Max:');
    console.log('=' .repeat(50));
    const qwenResult = await testQwenModel();
    console.log('✅ Resposta do Qwen:');
    console.log(JSON.stringify(qwenResult, null, 2));

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('Detalhes:', error);
  }
}

runTests();
