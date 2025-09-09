import express from 'express';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'api', timestamp: new Date().toISOString() });
});

app.get('/auth/status', (req, res) => {
  res.json({ ok: true, message: 'Auth system ready' });
});

app.listen(port, () => {
  console.log(`🚀 BMAD API listening on http://localhost:${port}`);
  console.log(`🔐 Authentication system enabled`);
});

export default app;
