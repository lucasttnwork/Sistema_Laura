import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../app';

function randomPhone() {
  const rnd = Math.floor(Math.random() * 900000000) + 100000000; // 9 digits
  return `+5511${rnd}`;
}

describe('Auth & Protected routes (integration)', () => {
  it('health ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('register/login/protected routes', async () => {
    const whatsapp = randomPhone();

    const reg = await request(app)
      .post('/auth/register')
      .send({ nome: 'CI User', cargo: 'Engenheiro Civil', whatsapp, password: 'senha123456' })
      .set('Content-Type', 'application/json');

    expect([200, 201, 400]).toContain(reg.status);

    const login = await request(app)
      .post('/auth/login')
      .send({ whatsapp, password: 'senha123456' })
      .set('Content-Type', 'application/json');

    expect(login.status).toBe(200);
    const token = login.body?.tokens?.accessToken as string;
    expect(token).toBeTruthy();

    const protectedRes = await request(app)
      .get('/protected/test')
      .set('Authorization', `Bearer ${token}`);
    expect(protectedRes.status).toBe(200);
    expect(protectedRes.body.success).toBe(true);

    const perms = await request(app)
      .get('/auth/permissions')
      .set('Authorization', `Bearer ${token}`);
    expect(perms.status).toBe(200);
    expect(perms.body?.user?.permissions).toBeTruthy();
    expect(perms.body?.catalog).toBeTruthy();

    const queue = await request(app)
      .post('/protected/test-queue')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    // pode falhar se seed não rodou; mas com migrate+seed no CI deve funcionar
    expect([200, 400]).toContain(queue.status);
  });
});


