import { pino, type Logger } from 'pino';

export function createLogger(level: string, pretty: boolean): Logger {
  return pino({
    level,
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'res.headers["set-cookie"]',
        '*.password',
        '*.passwordHash',
        '*.keys',
        '*.token',
      ],
      censor: '[redacted]',
    },
    ...(pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss' },
          },
        }
      : {}),
  });
}

export let logger: Logger = pino({ level: 'info' });

export function setLogger(next: Logger) {
  logger = next;
}
