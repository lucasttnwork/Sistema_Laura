import express from 'express';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const port = process.env.SMOKE_PORT ? Number(process.env.SMOKE_PORT) : 3001;

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api', timestamp: new Date().toISOString() });
});

app.get('/db-check', async (_req, res) => {
  try {
    const now = await prisma.$queryRaw`SELECT NOW()`;
    res.json({ ok: true, now });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

app.listen(port, () => {
  console.log(`🚀 Smoke server listening on http://localhost:${port}`);
});


