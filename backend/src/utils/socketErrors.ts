import { Socket } from 'socket.io';
import { SocketError, SocketErrorCode } from '../types';
import logger from './logger';

// Factory helpers for consistent error objects
export function createSocketError(
  code: SocketErrorCode,
  message: string,
  details?: Record<string, unknown>,
  recoverable: boolean = false
): SocketError {
  return { code, message, details, recoverable };
}

// Emit a structured error and log it
export function emitSocketError(socket: Socket, err: SocketError): void {
  logger.warn('socket error emitted', {
    code: err.code,
    message: err.message,
    details: err.details,
    socketId: socket.id,
  });
  socket.emit('error', err);
}
