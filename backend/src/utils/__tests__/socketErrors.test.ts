/**
 * Socket Errors Test Suite
 * 
 * Tests for socket error handling utilities:
 * - Error object creation with proper structure
 * - Error emission to sockets
 * - Recoverable vs non-recoverable errors
 * - Error details and metadata handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Socket } from 'socket.io';
import { createSocketError, emitSocketError } from '../socketErrors';
import { SocketErrorCode } from '../../types';

describe('Socket Errors', () => {
  describe('createSocketError', () => {
    it('should create a socket error with required fields', () => {
      const error = createSocketError(
        SocketErrorCode.VALIDATION,
        'Test error message'
      );

      expect(error).toEqual({
        code: SocketErrorCode.VALIDATION,
        message: 'Test error message',
        details: undefined,
        recoverable: false,
      });
    });

    it('should create a socket error with details', () => {
      const details = { field: 'nickname', reason: 'too long' };
      const error = createSocketError(
        SocketErrorCode.VALIDATION,
        'Validation failed',
        details
      );

      expect(error).toEqual({
        code: SocketErrorCode.VALIDATION,
        message: 'Validation failed',
        details,
        recoverable: false,
      });
    });

    it('should create a recoverable socket error', () => {
      const error = createSocketError(
        SocketErrorCode.ROOM_FULL,
        'Room is full',
        undefined,
        true
      );

      expect(error.recoverable).toBe(true);
    });

    it('should default recoverable to false', () => {
      const error = createSocketError(
        SocketErrorCode.INTERNAL_ERROR,
        'Internal error'
      );

      expect(error.recoverable).toBe(false);
    });

    it('should handle different error codes', () => {
      const errorCodes: SocketErrorCode[] = [
        SocketErrorCode.VALIDATION,
        SocketErrorCode.ROOM_NOT_FOUND,
        SocketErrorCode.ROOM_FULL,
        SocketErrorCode.NICKNAME_TAKEN,
        SocketErrorCode.UNAUTHORIZED,
        SocketErrorCode.INTERNAL_ERROR,
      ];

      errorCodes.forEach((code) => {
        const error = createSocketError(code, 'Test message');
        expect(error.code).toBe(code);
      });
    });

    it('should handle complex details objects', () => {
      const complexDetails = {
        timestamp: Date.now(),
        userId: 'user-123',
        roomId: 'room-456',
        metadata: {
          attempt: 3,
          maxAttempts: 5,
        },
      };

      const error = createSocketError(
        SocketErrorCode.VALIDATION,
        'Complex error',
        complexDetails
      );

      expect(error.details).toEqual(complexDetails);
    });
  });

  describe('emitSocketError', () => {
    let mockSocket: Socket;

    beforeEach(() => {
      mockSocket = {
        id: 'socket-123',
        emit: vi.fn(),
      } as unknown as Socket;
    });

    it('should emit error event with error object', () => {
      const error = createSocketError(
        SocketErrorCode.VALIDATION,
        'Test error'
      );

      emitSocketError(mockSocket, error);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', error);
    });

    it('should emit error with details', () => {
      const error = createSocketError(
        SocketErrorCode.ROOM_FULL,
        'Room is full',
        { capacity: 10, current: 10 }
      );

      emitSocketError(mockSocket, error);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: SocketErrorCode.ROOM_FULL,
        message: 'Room is full',
        details: { capacity: 10, current: 10 },
        recoverable: false,
      });
    });

    it('should emit recoverable errors', () => {
      const error = createSocketError(
        SocketErrorCode.NICKNAME_TAKEN,
        'Nickname already in use',
        { nickname: 'Alice' },
        true
      );

      emitSocketError(mockSocket, error);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: SocketErrorCode.NICKNAME_TAKEN,
        message: 'Nickname already in use',
        details: { nickname: 'Alice' },
        recoverable: true,
      });
    });

    it('should handle multiple error emissions', () => {
      const error1 = createSocketError(
        SocketErrorCode.VALIDATION,
        'First error'
      );
      const error2 = createSocketError(
        SocketErrorCode.ROOM_NOT_FOUND,
        'Second error'
      );

      emitSocketError(mockSocket, error1);
      emitSocketError(mockSocket, error2);

      expect(mockSocket.emit).toHaveBeenCalledTimes(2);
      expect(mockSocket.emit).toHaveBeenNthCalledWith(1, 'error', error1);
      expect(mockSocket.emit).toHaveBeenNthCalledWith(2, 'error', error2);
    });

    it('should work with different socket IDs', () => {
      const socket1 = { id: 'socket-1', emit: vi.fn() } as unknown as Socket;
      const socket2 = { id: 'socket-2', emit: vi.fn() } as unknown as Socket;

      const error = createSocketError(
        SocketErrorCode.VALIDATION,
        'Test'
      );

      emitSocketError(socket1, error);
      emitSocketError(socket2, error);

      expect(socket1.emit).toHaveBeenCalledWith('error', error);
      expect(socket2.emit).toHaveBeenCalledWith('error', error);
    });
  });

  describe('Integration: createSocketError + emitSocketError', () => {
    let mockSocket: Socket;

    beforeEach(() => {
      mockSocket = {
        id: 'socket-123',
        emit: vi.fn(),
      } as unknown as Socket;
    });

    it('should create and emit a complete error workflow', () => {
      // Create error
      const error = createSocketError(
        SocketErrorCode.ROOM_NOT_FOUND,
        'The requested room does not exist',
        { roomId: 'room-123' },
        false
      );

      // Verify error structure
      expect(error.code).toBe(SocketErrorCode.ROOM_NOT_FOUND);
      expect(error.message).toBe('The requested room does not exist');
      expect(error.details).toEqual({ roomId: 'room-123' });
      expect(error.recoverable).toBe(false);

      // Emit error
      emitSocketError(mockSocket, error);

      // Verify emission
      expect(mockSocket.emit).toHaveBeenCalledWith('error', error);
    });

    it('should handle validation error workflow', () => {
      const validationError = createSocketError(
        SocketErrorCode.VALIDATION,
        'Invalid nickname format',
        {
          field: 'nickname',
          value: 'invalid@nickname',
          rule: 'alphanumeric_only',
        },
        true
      );

      emitSocketError(mockSocket, validationError);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        code: SocketErrorCode.VALIDATION,
        message: 'Invalid nickname format',
        details: {
          field: 'nickname',
          value: 'invalid@nickname',
          rule: 'alphanumeric_only',
        },
        recoverable: true,
      });
    });

    it('should handle unauthorized error workflow', () => {
      const unauthorizedError = createSocketError(
        SocketErrorCode.UNAUTHORIZED,
        'You must be the room owner to perform this action',
        {
          requiredRole: 'owner',
          userRole: 'participant',
          action: 'kick_user',
        },
        false
      );

      emitSocketError(mockSocket, unauthorizedError);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', unauthorizedError);
    });
  });
});
