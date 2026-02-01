import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'democracy-watch',
    env: process.env.NODE_ENV || 'development',
  },
});

export function createLogger(name: string) {
  return logger.child({ component: name });
}
