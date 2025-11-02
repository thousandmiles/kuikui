import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import log from 'loglevel';
import { logger, LogLevel } from '../logger';

// Mock loglevel
vi.mock('loglevel', () => ({
  default: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  },
}));

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic logging methods', () => {
    it('should call log.trace with formatted message', () => {
      const message = 'trace message';
      logger.trace(message);

      expect(log.trace).toHaveBeenCalledWith(message);
    });

    it('should call log.debug with formatted message', () => {
      const message = 'debug message';
      logger.debug(message);

      expect(log.debug).toHaveBeenCalledWith(message);
    });

    it('should call log.info with formatted message', () => {
      const message = 'info message';
      logger.info(message);

      expect(log.info).toHaveBeenCalledWith(message);
    });

    it('should call log.warn with formatted message', () => {
      const message = 'warning message';
      logger.warn(message);

      expect(log.warn).toHaveBeenCalledWith(message);
    });

    it('should call log.error with formatted message', () => {
      const message = 'error message';
      logger.error(message);

      expect(log.error).toHaveBeenCalledWith(message);
    });
  });

  describe('Logging with metadata', () => {
    it('should include metadata in trace message', () => {
      const message = 'trace with meta';
      const meta = { userId: '123', action: 'click' };
      logger.trace(message, meta);

      expect(log.trace).toHaveBeenCalledWith(
        `${message} ${JSON.stringify(meta)}`
      );
    });

    it('should include metadata in debug message', () => {
      const message = 'debug with meta';
      const meta = { component: 'Button' };
      logger.debug(message, meta);

      expect(log.debug).toHaveBeenCalledWith(
        `${message} ${JSON.stringify(meta)}`
      );
    });

    it('should include metadata in info message', () => {
      const message = 'info with meta';
      const meta = { status: 'success' };
      logger.info(message, meta);

      expect(log.info).toHaveBeenCalledWith(
        `${message} ${JSON.stringify(meta)}`
      );
    });

    it('should include metadata in warn message', () => {
      const message = 'warning with meta';
      const meta = { retries: 3 };
      logger.warn(message, meta);

      expect(log.warn).toHaveBeenCalledWith(
        `${message} ${JSON.stringify(meta)}`
      );
    });
  });

  describe('Error logging', () => {
    it('should log Error instance with message and stack', () => {
      const message = 'operation failed';
      const error = new Error('Test error');
      logger.error(message, error);

      const callArgs = (log.error as any).mock.calls[0][0];
      expect(callArgs).toContain(message);
      expect(callArgs).toContain('Error: Test error');
    });

    it('should log error with metadata', () => {
      const message = 'operation failed';
      const error = new Error('Test error');
      const meta = { userId: '123' };
      logger.error(message, error, meta);

      const callArgs = (log.error as any).mock.calls[0][0];
      expect(callArgs).toContain(message);
      expect(callArgs).toContain('Error: Test error');
      expect(callArgs).toContain(JSON.stringify(meta));
    });

    it('should log non-Error objects', () => {
      const message = 'operation failed';
      const error = { code: 'ERR_001', details: 'Something went wrong' };
      logger.error(message, error);

      const callArgs = (log.error as any).mock.calls[0][0];
      expect(callArgs).toContain(message);
      expect(callArgs).toContain(JSON.stringify(error));
    });

    it('should log error without error object', () => {
      const message = 'simple error';
      logger.error(message);

      expect(log.error).toHaveBeenCalledWith(message);
    });

    it('should log error with only metadata', () => {
      const message = 'error with meta only';
      const meta = { context: 'api-call' };
      logger.error(message, undefined, meta);

      const callArgs = (log.error as any).mock.calls[0][0];
      expect(callArgs).toContain(message);
      expect(callArgs).toContain(JSON.stringify(meta));
    });
  });

  describe('Context-specific logging', () => {
    it('should create logger with context', () => {
      const contextLogger = logger.withContext('API');
      contextLogger.info('test message');

      expect(log.info).toHaveBeenCalledWith('[API] test message');
    });

    it('should preserve context in nested loggers', () => {
      const apiLogger = logger.withContext('API');
      const userLogger = apiLogger.withContext('User');
      userLogger.debug('user action');

      expect(log.debug).toHaveBeenCalledWith('[User] user action');
    });

    it('should include context with metadata', () => {
      const contextLogger = logger.withContext('Socket');
      contextLogger.warn('connection issue', { retries: 3 });

      expect(log.warn).toHaveBeenCalledWith(
        '[Socket] connection issue {"retries":3}'
      );
    });

    it('should include context in error logging', () => {
      const contextLogger = logger.withContext('Database');
      const error = new Error('Connection timeout');
      contextLogger.error('query failed', error);

      const callArgs = (log.error as any).mock.calls[0][0];
      expect(callArgs).toContain('[Database]');
      expect(callArgs).toContain('query failed');
      expect(callArgs).toContain('Connection timeout');
    });
  });

  describe('Convenience methods', () => {
    describe('api()', () => {
      it('should log API call without status code', () => {
        logger.api('GET', '/api/users');

        expect(log.info).toHaveBeenCalledWith('API: GET /api/users');
      });

      it('should log API call with status code', () => {
        logger.api('POST', '/api/rooms', 201);

        expect(log.info).toHaveBeenCalledWith('API: POST /api/rooms - 201');
      });

      it('should log API call with status code and duration', () => {
        logger.api('GET', '/api/rooms', 200, 150);

        expect(log.info).toHaveBeenCalledWith(
          'API: GET /api/rooms - 200 (150ms)'
        );
      });

      it('should log API call with duration but no status code', () => {
        logger.api('DELETE', '/api/rooms/123', undefined, 50);

        expect(log.info).toHaveBeenCalledWith('API: DELETE /api/rooms/123');
      });
    });

    describe('socket()', () => {
      it('should log socket event without metadata', () => {
        logger.socket('connect', 'Connected to server');

        expect(log.debug).toHaveBeenCalledWith(
          'Socket connect: Connected to server'
        );
      });

      it('should log socket event with metadata', () => {
        const meta = { roomId: 'room-123', userId: 'user-456' };
        logger.socket('join', 'Joined room', meta);

        expect(log.debug).toHaveBeenCalledWith(
          `Socket join: Joined room ${JSON.stringify(meta)}`
        );
      });
    });

    describe('component()', () => {
      it('should log component action without metadata', () => {
        logger.component('ChatArea', 'mounted');

        expect(log.debug).toHaveBeenCalledWith('ChatArea: mounted');
      });

      it('should log component action with metadata', () => {
        const meta = { messageCount: 10 };
        logger.component('ChatArea', 'messages updated', meta);

        expect(log.debug).toHaveBeenCalledWith(
          `ChatArea: messages updated ${JSON.stringify(meta)}`
        );
      });
    });

    describe('user()', () => {
      it('should log user action without metadata', () => {
        logger.user('login');

        expect(log.info).toHaveBeenCalledWith('User: login');
      });

      it('should log user action with metadata', () => {
        const meta = { userId: 'user-789', nickname: 'TestUser' };
        logger.user('joined room', meta);

        expect(log.info).toHaveBeenCalledWith(
          `User: joined room ${JSON.stringify(meta)}`
        );
      });
    });
  });

  describe('LogLevel enum', () => {
    it('should have correct log level values', () => {
      expect(LogLevel.TRACE).toBe('TRACE');
      expect(LogLevel.DEBUG).toBe('DEBUG');
      expect(LogLevel.INFO).toBe('INFO');
      expect(LogLevel.WARN).toBe('WARN');
      expect(LogLevel.ERROR).toBe('ERROR');
      expect(LogLevel.SILENT).toBe('SILENT');
    });
  });
});
