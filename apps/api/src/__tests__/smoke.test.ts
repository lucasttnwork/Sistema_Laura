import { describe, it, expect } from 'vitest';
import { healthHandler, createDbCheckHandler } from '../routes/public';

const createRes = () => {
  return {
    statusCode: 0,
    body: undefined as any,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    setHeader(name: string, value: string) { this.headers[name.toLowerCase()] = value; },
    json(obj: any) { if (!this.statusCode) this.statusCode = 200; this.body = obj; },
  } as any;
};

describe('Smoke: health and db-check', () => {
  it('GET /health deve responder 200', () => {
    const res = createRes();
    healthHandler({} as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body?.ok).toBe(true);
  });

  it('GET /db-check 200 com DB OK', async () => {
    const prisma = { $queryRaw: async () => [{ now: new Date().toISOString() }] } as any;
    const handler = createDbCheckHandler(prisma);
    const res = createRes();
    await handler({} as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body?.ok).toBe(true);
  });

  it('GET /db-check 500 quando sem DB', async () => {
    const prisma = { $queryRaw: async () => { throw new Error('no db'); } } as any;
    const handler = createDbCheckHandler(prisma);
    const res = createRes();
    await handler({} as any, res);
    expect(res.statusCode).toBe(500);
    expect(res.body?.ok).toBe(false);
  });
});


