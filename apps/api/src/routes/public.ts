// Handlers públicos reutilizáveis para testes e app

export const healthHandler = (_req: any, res: any) => {
  res.json({ ok: true, service: 'api', timestamp: new Date().toISOString() });
};

export const createDbCheckHandler = (prisma: any) => async (_req: any, res: any) => {
  try {
    const now = await prisma.$queryRaw`SELECT NOW()`;
    res.json({ ok: true, now });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
};


