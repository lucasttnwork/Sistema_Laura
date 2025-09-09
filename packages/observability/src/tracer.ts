import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { trace } from '@opentelemetry/api';

let initialized = false;
let currentServiceName = 'bmad-laura-01';

export function initTracing(opts?: { serviceName?: string; zipkinUrl?: string }): void {
  if (initialized) return;
  currentServiceName = opts?.serviceName || currentServiceName;
  const provider = new NodeTracerProvider();
  const zipkinExporter = new ZipkinExporter({
    url: opts?.zipkinUrl || process.env.ZIPKIN_URL || 'http://localhost:9411/api/v2/spans',
    serviceName: currentServiceName,
  });
  provider.addSpanProcessor(new SimpleSpanProcessor(zipkinExporter));
  provider.register();
  initialized = true;
}

// Initialize by default with env/provided defaults, can be no-op if initTracing called earlier
if (!initialized) {
  initTracing({});
}

export const tracer = () => trace.getTracer(currentServiceName, '1.0.0');

export default tracer;
