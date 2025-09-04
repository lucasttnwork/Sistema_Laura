declare module '@bmad/observability' {
  export function initTracing(opts: { serviceName: string }): void;
  export function registerDefaultMetrics(): void;
  export function startMetricsServer(port?: number): void;
}


