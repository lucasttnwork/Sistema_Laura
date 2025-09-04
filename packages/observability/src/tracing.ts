import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

let sdk: NodeSDK | null = null;

export function initTracing(params?: { serviceName?: string; serviceVersion?: string; environment?: string; otlpEndpoint?: string }) {
  if (sdk) {
    return sdk;
  }

  const serviceName = params?.serviceName || process.env.OTEL_SERVICE_NAME || 'bmad-service';
  const serviceVersion = params?.serviceVersion || process.env.npm_package_version || '0.0.0';
  const environment = params?.environment || process.env.NODE_ENV || 'development';
  const otlpEndpoint = params?.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

  const resource = new Resource({
    'service.name': serviceName,
    'service.version': serviceVersion,
    'deployment.environment': environment,
  });

  const traceExporter = new OTLPTraceExporter({ url: otlpEndpoint });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  Promise.resolve(sdk.start()).catch((err: unknown) => {
    console.error('Failed to start OpenTelemetry SDK', err);
  });

  process.once('SIGTERM', () => {
    if (!sdk) return;
    Promise.resolve(sdk.shutdown()).catch((err: unknown) => console.error('Error during OTel shutdown', err));
  });

  return sdk;
}


