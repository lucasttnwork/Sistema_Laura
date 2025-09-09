import client from 'prom-client';
import express from 'express';

let defaultRegistered = false;

export function registerDefaultMetrics(): void {
  if (defaultRegistered) return;
  client.collectDefaultMetrics();
  defaultRegistered = true;
}

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5]
});

export const authRequestCounter = new client.Counter({
  name: 'auth_requests_total',
  help: 'Total de requisições de autenticação por tipo e resultado',
  labelNames: ['action', 'result']
});

export function metricsRouter(): express.Router {
  const router = express.Router();
  router.get('/metrics', async (_req, res) => {
    try {
      res.set('Content-Type', client.register.contentType);
      const metrics = await client.register.metrics();
      res.end(metrics);
    } catch (err) {
      res.status(500).end(String(err));
    }
  });
  return router;
}

export function timingMiddleware() {
  return function (req: express.Request, res: express.Response, next: express.NextFunction) {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
      const route = (req.route && req.route.path) || req.path || 'unknown';
      end({ method: req.method, route, status_code: String(res.statusCode) });
    });
    next();
  };
}

export default {
  registerDefaultMetrics,
  metricsRouter,
  httpRequestDuration,
  authRequestCounter,
  timingMiddleware,
};


