import log from 'loglevel';
import { frontendConfig } from '../config/environment';

// Define log levels for better type safety
export enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SILENT = 'SILENT',
}

// Configure log level based on environment
const getLogLevel = (): log.LogLevelDesc => {
  const envLevel = (
    import.meta.env.VITE_LOG_LEVEL as string | undefined
  )?.toUpperCase();
  if (envLevel && Object.values(LogLevel).includes(envLevel as LogLevel)) {
    return envLevel as log.LogLevelDesc;
  }
  return frontendConfig.NODE_ENV === 'development' ? 'DEBUG' : 'WARN';
};

// Set the log level
log.setLevel(getLogLevel());

// Enhanced logger interface with context support
interface LogMeta {
  [key: string]: unknown;
}

interface Logger {
  trace(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, error?: unknown, meta?: LogMeta): void;

  // Context-specific loggers
  withContext(context: string): Logger;

  // Convenience methods for common use cases
  api(
    method: string,
    path: string,
    statusCode?: number,
    duration?: number
  ): void;
  socket(event: string, message: string, meta?: LogMeta): void;
  component(name: string, action: string, meta?: LogMeta): void;
  user(action: string, meta?: LogMeta): void;
}

// Create enhanced logger with context support
const createLogger = (context?: string): Logger => {
  const formatMessage = (message: string, meta?: LogMeta): string => {
    const contextStr = context ? `[${context}] ` : '';
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `${contextStr}${message}${metaStr}`;
  };

  const formatError = (
    message: string,
    error?: unknown,
    meta?: LogMeta
  ): string => {
    const contextStr = context ? `[${context}] ` : '';
    let errorStr = '';

    if (error instanceof Error) {
      errorStr = ` Error: ${error.message}`;
      if (frontendConfig.NODE_ENV === 'development' && error.stack) {
        errorStr += `\nStack: ${error.stack}`;
      }
    } else if (error) {
      errorStr = ` ${JSON.stringify(error)}`;
    }

    const metaStr = meta ? ` Meta: ${JSON.stringify(meta)}` : '';
    return `${contextStr}${message}${errorStr}${metaStr}`;
  };

  return {
    trace: (message: string, meta?: LogMeta) => {
      log.trace(formatMessage(message, meta));
    },

    debug: (message: string, meta?: LogMeta) => {
      log.debug(formatMessage(message, meta));
    },

    info: (message: string, meta?: LogMeta) => {
      log.info(formatMessage(message, meta));
    },

    warn: (message: string, meta?: LogMeta) => {
      log.warn(formatMessage(message, meta));
    },

    error: (message: string, error?: unknown, meta?: LogMeta) => {
      log.error(formatError(message, error, meta));
    },

    withContext: (newContext: string) => createLogger(newContext),

    api: (
      method: string,
      path: string,
      statusCode?: number,
      duration?: number
    ) => {
      const message = statusCode
        ? `${method} ${path} - ${statusCode}${duration ? ` (${duration}ms)` : ''}`
        : `${method} ${path}`;
      log.info(formatMessage(`API: ${message}`));
    },

    socket: (event: string, message: string, meta?: LogMeta) => {
      log.debug(formatMessage(`Socket ${event}: ${message}`, meta));
    },

    component: (name: string, action: string, meta?: LogMeta) => {
      log.debug(formatMessage(`${name}: ${action}`, meta));
    },

    user: (action: string, meta?: LogMeta) => {
      log.info(formatMessage(`User: ${action}`, meta));
    },
  };
};

// Create default logger instance
const logger = createLogger();

// Export both the enhanced logger and the original loglevel instance
export { log as loglevel, logger };
export default logger;
