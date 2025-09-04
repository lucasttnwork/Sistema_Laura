import express from 'express';
import client from 'prom-client';

export const register = client.register;

export function registerDefaultMetrics() {
  client.collectDefaultMetrics();
}

export function metricsRouter() {
  const router = express.Router();
  router.get('/metrics', async (_req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err: any) {
      res.status(500).send(err?.message || 'metrics error');
    }
  });
  return router;
}

export function startMetricsServer(port: number) {
  const app = express();
  app.use(metricsRouter());
  app.listen(port, () => {
    console.log(`📈 Metrics server listening on http://localhost:${port}/metrics`);
  });
}


