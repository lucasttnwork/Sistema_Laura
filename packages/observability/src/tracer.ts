import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { trace } from '@opentelemetry/api';

// Initialize tracer provider
const provider = new NodeTracerProvider();

// Configure Zipkin exporter for development
const zipkinExporter = new ZipkinExporter({
  url: process.env.ZIPKIN_URL || 'http://localhost:9411/api/v2/spans',
  serviceName: 'bmad-laura-01'
});

provider.addSpanProcessor(new SimpleSpanProcessor(zipkinExporter));
provider.register();

// Get tracer instance
export const tracer = trace.getTracer('bmad-laura-01', '1.0.0');

export default tracer;
