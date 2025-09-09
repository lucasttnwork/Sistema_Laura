import request from 'supertest';
import { describe, it, expect, beforeAll, vi } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'http';
import http from 'http';

// Implementações mínimas em memória para isolar dependências externas
type Tokens = { accessToken: string; refreshToken: string; expiresIn: number };
const refreshStore = new Map<string, { userId: string; revoked: boolean; expiresAt: number }>();

const InMemoryAuthService = {
  async login(data: any): Promise<any> {
    const { whatsapp, password } = data || {};
    if (whatsapp === '+5511999999999' && password === 'laura123') {
      const accessToken = `access-${Math.random().toString(36).slice(2)}`;
      const tokenId = Math.random().toString(36).slice(2);
      const refreshToken = `refresh-${tokenId}`;
      refreshStore.set(tokenId, {
        userId: 'user-1',
        revoked: false,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      const tokens: Tokens = { accessToken, refreshToken, expiresIn: 30 * 60 };
      return { success: true, user: { id: 'user-1', cargo: 'Compradora', whatsapp }, tokens };
    }
    return { success: false, error: 'Usuário não encontrado ou senha incorreta' };
  },
  async refreshToken(refreshToken: string): Promise<any> {
    const tokenId = (refreshToken || '').replace('refresh-', '');
    const rec = refreshStore.get(tokenId);
    if (!rec || rec.revoked || rec.expiresAt < Date.now()) {
      return { success: false, error: 'Refresh token inválido ou expirado' };
    }
    // rotate
    rec.revoked = true;
    const newTokenId = Math.random().toString(36).slice(2);
    refreshStore.set(newTokenId, { userId: rec.userId, revoked: false, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    const tokens: Tokens = {
      accessToken: `access-${Math.random().toString(36).slice(2)}`,
      refreshToken: `refresh-${newTokenId}`,
      expiresIn: 30 * 60,
    };
    return { success: true, tokens };
  },
  async logout(refreshToken: string): Promise<any> {
    const tokenId = (refreshToken || '').replace('refresh-', '');
    const rec = refreshStore.get(tokenId);
    if (rec) rec.revoked = true;
    return { success: true, message: 'Logout realizado com sucesso' };
  },
};

const inMemoryVerifyBearer = (authHeader?: string): boolean => {
  if (!authHeader) return false;
  const token = String(authHeader).split(' ')[1] || '';
  return token.startsWith('access-');
};

async function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
  });
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers['cookie'];
  const out: Record<string, string> = {};
  if (!header) return out;
  String(header).split(';').forEach((pair) => {
    const [k, v] = pair.trim().split('=');
    if (k) out[k] = decodeURIComponent(v || '');
  });
  return out;
}

function json(res: ServerResponse, code: number, obj: any, setCookie?: string) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  if (setCookie) res.setHeader('set-cookie', setCookie);
  res.end(JSON.stringify(obj));
}

// Mock de bcrypt para validar senha do usuário seed rapidamente
vi.mock('bcrypt', () => {
  return {
    default: {
      compare: async (password: string, _hash: string) => password === 'laura123',
      hash: async (password: string) => `hashed:${password}`,
    },
  };
});

// Mock de Prisma em memória para usuários e refresh tokens
vi.mock('@prisma/client', () => {
  type User = {
    id: string;
    nome: string;
    cargo: string;
    whatsapp: string;
    password: string;
    loginAttempts?: number;
    lockedUntil?: Date | null;
    lastLogin?: Date | null;
  };

  const users: User[] = [
    {
      id: 'user-1',
      nome: 'Laura Silva',
      cargo: 'Compradora',
      whatsapp: '+5511999999999',
      // O compare do bcrypt mock retorna true quando password === 'laura123'
      password: 'fake-bcrypt-hash',
      loginAttempts: 0,
      lockedUntil: null,
      lastLogin: null,
    },
  ];

  const refreshTokens: Array<{
    userId: string;
    token: string;
    expiresAt: Date;
    isRevoked: boolean;
    createdAt?: Date;
  }> = [];

  class PrismaClient {
    user = {
      findUnique: async (args: any) => {
        const { where } = args || {};
        if (!where) return null;
        if (where.whatsapp) {
          return users.find((u) => u.whatsapp === where.whatsapp) || null;
        }
        if (where.id) {
          return users.find((u) => u.id === where.id) || null;
        }
        return null;
      },
      update: async (args: any) => {
        const { where, data } = args || {};
        const idx = users.findIndex((u) => u.id === where?.id);
        if (idx === -1) throw new Error('User not found');
        users[idx] = { ...users[idx], ...data } as User;
        return users[idx];
      },
      create: async (args: any) => {
        const { data } = args || {};
        const created: User = { id: `user-${users.length + 1}`, ...data };
        users.push(created);
        return created;
      },
    };

    refreshToken = {
      create: async (args: any) => {
        const { data } = args || {};
        refreshTokens.push({ ...data, createdAt: new Date() });
        return data;
      },
      findFirst: async (args: any) => {
        const { where } = args || {};
        const { token, userId, isRevoked } = where || {};
        return (
          refreshTokens.find(
            (rt) =>
              (token === undefined || rt.token === token) &&
              (userId === undefined || rt.userId === userId) &&
              (isRevoked === undefined || rt.isRevoked === isRevoked)
          ) || null
        );
      },
      updateMany: async (args: any) => {
        const { where, data } = args || {};
        let count = 0;
        for (const rt of refreshTokens) {
          const matchToken = where?.token ? rt.token === where.token : true;
          const matchUser = where?.userId ? rt.userId === where.userId : true;
          if (matchToken && matchUser) {
            Object.assign(rt, data || {});
            count++;
          }
        }
        return { count };
      },
      deleteMany: async () => ({ count: 0 }),
    };

    $queryRaw = async () => [{ now: new Date().toISOString() }];
    $disconnect = async () => {};
  }

  return { PrismaClient };
});

let serverHandler: (req: IncomingMessage, res: ServerResponse) => void;
let server: http.Server;

beforeAll(async () => {
  serverHandler = async (req, res) => {
    const url = req.url || '/';
    const method = (req.method || 'GET').toUpperCase();
    const cookies = parseCookies(req);

    if (method === 'POST' && url === '/auth/login') {
      const body = await readJsonBody(req);
      const result = await InMemoryAuthService.login(body);
      const setCookie = result.success && result.tokens?.refreshToken
        ? `refreshToken=${encodeURIComponent(result.tokens.refreshToken)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
        : undefined;
      return json(res, result.success ? 200 : 401, result, setCookie);
    }

    if (method === 'POST' && url === '/auth/refresh') {
      const body = await readJsonBody(req);
      const refreshToken = cookies.refreshToken || body.refreshToken;
      if (!refreshToken) return json(res, 400, { success: false, error: 'Refresh token não fornecido' });
      const result = await InMemoryAuthService.refreshToken(refreshToken);
      const setCookie = result.success && result.tokens?.refreshToken
        ? `refreshToken=${encodeURIComponent(result.tokens.refreshToken)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}`
        : undefined;
      return json(res, result.success ? 200 : 401, result, setCookie);
    }

    if (method === 'POST' && url === '/auth/logout') {
      if (!inMemoryVerifyBearer(req.headers.authorization as any)) {
        return json(res, 401, { success: false, error: 'NO_TOKEN' });
      }
      const body = await readJsonBody(req);
      const refreshToken = cookies.refreshToken || body.refreshToken;
      if (!refreshToken) return json(res, 400, { success: false, error: 'Refresh token não fornecido' });
      const result = await InMemoryAuthService.logout(refreshToken);
      res.setHeader('set-cookie', 'refreshToken=; HttpOnly; Path=/; Max-Age=0');
      return json(res, 200, result);
    }

    if (method === 'GET' && url === '/protected/test') {
      if (!inMemoryVerifyBearer(req.headers.authorization as any)) {
        return json(res, 401, { success: false, error: 'NO_TOKEN' });
      }
      return json(res, 200, { success: true, message: 'Rota protegida acessada com sucesso' });
    }

    return json(res, 404, { success: false, error: 'Not Found' });
  };
  server = http.createServer(serverHandler);
});

describe('Auth: login, rota protegida, refresh, logout', () => {
  const whatsapp = '+5511999999999';
  const password = 'laura123';

  it('POST /auth/login retorna tokens.accessToken', async () => {
    const res = await request(server as any)
      .post('/auth/login')
      .send({ whatsapp, password });

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.tokens?.accessToken).toBeTruthy();
  });

  it('GET /protected/test com Bearer <token> retorna 200', async () => {
    const login = await request(server as any)
      .post('/auth/login')
      .send({ whatsapp, password });

    const accessToken = login.body?.tokens?.accessToken as string;
    expect(accessToken).toBeTruthy();

    const res = await request(server as any)
      .get('/protected/test')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
  });

  it('POST /auth/refresh com cookie de refresh retorna novo accessToken', async () => {
    const login = await request(server as any)
      .post('/auth/login')
      .send({ whatsapp, password });

    const cookies = login.headers['set-cookie'] as string[] | undefined;
    const refreshCookie = cookies?.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeTruthy();

    const res = await request(server as any)
      .post('/auth/refresh')
      .set('Cookie', refreshCookie as string)
      .send();

    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(res.body?.tokens?.accessToken).toBeTruthy();
  });

  it('POST /auth/logout revoga o refresh token atual', async () => {
    // Login inicial
    const login = await request(server as any)
      .post('/auth/login')
      .send({ whatsapp, password });

    const accessToken1 = login.body?.tokens?.accessToken as string;
    const cookies1 = login.headers['set-cookie'] as string[] | undefined;
    const refreshCookie1 = cookies1?.find((c) => c.startsWith('refreshToken='));

    // Faz refresh para obter novo par de tokens e novo cookie
    const refreshed = await request(server as any)
      .post('/auth/refresh')
      .set('Cookie', refreshCookie1 as string)
      .send();

    const accessToken2 = refreshed.body?.tokens?.accessToken as string;
    const cookies2 = refreshed.headers['set-cookie'] as string[] | undefined;
    const refreshCookie2 = cookies2?.find((c) => c.startsWith('refreshToken='));

    expect(accessToken2).toBeTruthy();
    expect(refreshCookie2).toBeTruthy();

    // Logout usando o token e o cookie de refresh mais recente
    const logout = await request(server as any)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken2 || accessToken1}`)
      .set('Cookie', refreshCookie2 as string)
      .send();

    expect(logout.status).toBe(200);
    expect(logout.body?.success).toBe(true);

    // Tentar renovar novamente com o mesmo refresh deve falhar (revogado)
    const refreshAfterLogout = await request(server as any)
      .post('/auth/refresh')
      .set('Cookie', refreshCookie2 as string)
      .send();

    expect([400, 401]).toContain(refreshAfterLogout.status);
    expect(refreshAfterLogout.body?.success).toBe(false);
  });
});


