declare module '@bmad/observability' {
  export function initTracing(opts: { serviceName: string }): void;
  export function registerDefaultMetrics(): void;
  export function metricsRouter(): import('express').Router;
}

declare module 'vitest' {
  export const describe: any;
  export const it: any;
  export const expect: any;
}

declare module 'supertest' {
  const request: any;
  export default request;
}


