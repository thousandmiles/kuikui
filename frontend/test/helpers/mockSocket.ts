import { vi } from 'vitest';

/**
 * Mock Socket.IO client
 */
export function createMockSocket() {
  const mockSocket = {
    id: 'mock-socket-id',
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
  };

  return mockSocket;
}

/**
 * Create a mock socket that simulates connection
 */
export function createConnectedMockSocket() {
  const socket = createMockSocket();
  socket.connected = true;
  return socket;
}

/**
 * Simulate socket event emission
 */
export function emitSocketEvent(
  socket: ReturnType<typeof createMockSocket>,
  event: string,
  data?: any
) {
  const listeners = socket.on.mock.calls.filter((call) => call[0] === event);
  listeners.forEach((listener) => {
    listener[1](data);
  });
}

/**
 * Get socket event listener
 */
export function getSocketListener(
  socket: ReturnType<typeof createMockSocket>,
  event: string
) {
  const call = socket.on.mock.calls.find((call) => call[0] === event);
  return call ? call[1] : undefined;
}
