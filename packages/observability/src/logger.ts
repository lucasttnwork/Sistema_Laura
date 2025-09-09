import winston from 'winston';

/**
 * Cria um logger filho por requisição, incluindo requestId/userId (se fornecidos)
 */
export function createRequestLogger(base: winston.Logger, context?: { requestId?: string; userId?: string }) {
  const child = base.child({
    ...(context?.requestId ? { requestId: context.requestId } : {}),
    ...(context?.userId ? { userId: context.userId } : {}),
  });
  return child;
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'bmad-laura-01' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Export logger instance
export default logger;
