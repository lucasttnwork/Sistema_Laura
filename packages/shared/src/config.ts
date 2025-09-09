// BMAD Shared Configuration
// Central configuration for Laura 01 System

export interface BMADConfig {
  app: {
    name: string;
    version: string;
    port: number;
    env: string;
  };
  database: {
    url: string;
    provider: string;
  };
  redis: {
    url: string;
    password?: string;
  };
  whatsapp: {
    zapi: {
      apiUrl: string;
      apiToken: string;
      instanceId: string;
    };
  };
  observability: {
    logLevel: string;
    zipkinUrl?: string;
  };
}

export function loadConfig(): BMADConfig {
  return {
    app: {
      name: process.env.APP_NAME || 'BMAD Laura 01',
      version: process.env.APP_VERSION || '1.0.0',
      port: parseInt(process.env.PORT || '3001'),
      env: process.env.NODE_ENV || 'development'
    },
    database: {
      url: process.env.DATABASE_URL || 'postgresql://localhost:5432/bmad',
      provider: 'postgresql'
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD
    },
    whatsapp: {
      zapi: {
        apiUrl: process.env.ZAPI_API_URL || 'https://api.z-api.io',
        apiToken: process.env.ZAPI_API_TOKEN || '',
        instanceId: process.env.ZAPI_INSTANCE_ID || ''
      }
    },
    observability: {
      logLevel: process.env.LOG_LEVEL || 'info',
      zipkinUrl: process.env.ZIPKIN_URL
    }
  };
}

export const config = loadConfig();
