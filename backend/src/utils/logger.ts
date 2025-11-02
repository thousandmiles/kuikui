import winston from 'winston';
import { backendConfig } from '../config/environment';

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to Winston
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
    const contextStr = context
      ? ` [${typeof context === 'string' ? context : JSON.stringify(context)}]`
      : '';
    const metaStr = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    return `${String(timestamp)} ${String(level)}${contextStr}: ${String(message)}${metaStr}`;
  })
);

// Define log format for production (without colors)
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determine log level based on environment
const getLogLevel = (): string => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (envLevel && Object.keys(logLevels).includes(envLevel)) {
    return envLevel;
  }
  return backendConfig.NODE_ENV === 'development' ? 'debug' : 'info';
};

// Create Winston logger
const logger = winston.createLogger({
  levels: logLevels,
  level: getLogLevel(),
  format:
    backendConfig.NODE_ENV === 'production' ? productionFormat : logFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Enhanced logger interface with context support
interface LogMeta {
  [key: string]: unknown;
}

interface Logger {
  error(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  http(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;

  // Context-specific loggers
  withContext(context: string): Logger;

  // Convenience methods for common use cases
  request(
    method: string,
    path: string,
    statusCode?: number,
    duration?: number
  ): void;
  socket(event: string, message: string, meta?: LogMeta): void;
  room(action: string, roomId: string, meta?: LogMeta): void;
}

// Create enhanced logger with context support
const createLogger = (context?: string): Logger => {
  const logWithContext = (
    level: string,
    message: string,
    meta: LogMeta = {}
  ) => {
    logger.log(level, message, { ...meta, context });
  };

  return {
    error: (message: string, meta?: LogMeta) =>
      logWithContext('error', message, meta),
    warn: (message: string, meta?: LogMeta) =>
      logWithContext('warn', message, meta),
    info: (message: string, meta?: LogMeta) =>
      logWithContext('info', message, meta),
    http: (message: string, meta?: LogMeta) =>
      logWithContext('http', message, meta),
    debug: (message: string, meta?: LogMeta) =>
      logWithContext('debug', message, meta),

    withContext: (newContext: string) => createLogger(newContext),

    request: (
      method: string,
      path: string,
      statusCode?: number,
      duration?: number
    ) => {
      const message = statusCode
        ? `${method} ${path} - ${statusCode}${duration ? ` (${duration}ms)` : ''}`
        : `${method} ${path}`;
      logWithContext('http', message);
    },

    socket: (event: string, message: string, meta?: LogMeta) => {
      logWithContext('debug', `Socket ${event}: ${message}`, meta);
    },

    room: (action: string, roomId: string, meta?: LogMeta) => {
      logWithContext('info', `Room ${action}: ${roomId}`, meta);
    },
  };
};

// Create default logger instance
const log = createLogger();

// Export both the enhanced logger and the original Winston instance
export { logger as winstonLogger, log };
export default log;
