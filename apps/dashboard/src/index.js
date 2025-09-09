// Dashboard Laura 01 - Sistema BMAD - Teste básico
const http = require('http');

const PORT = process.env.DASHBOARD_PORT || 3001;

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'laura-01-dashboard',
      timestamp: new Date().toISOString()
    }));
  } else if (req.url === '/api/dashboard/stats' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      solicitacoesPendentes: 12,
      cotacoesAguardandoAprovacao: 5,
      fornecedoresAtivos: 24,
      obrasAtivas: 8
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Laura 01 Dashboard running on port ${PORT}`);
});
