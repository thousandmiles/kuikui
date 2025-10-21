import { User, Room } from '../../src/types';

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    nickname: 'TestUser',
    socketId: 'test-socket-id',
    joinedAt: new Date(),
    isOnline: true,
    lastActivity: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock room for testing
 */
export function createMockRoom(overrides?: Partial<Room>): Room {
  return {
    id: 'test-room-id',
    createdAt: new Date(),
    lastActivity: new Date(),
    users: new Map(),
    messages: [],
    capacity: 10,
    ...overrides,
  };
}

/**
 * Sleep helper for async tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve): void => {
    setTimeout(resolve, ms);
  });
}

/**
 * Generate a random room ID
 */
export function generateRandomRoomId(): string {
  return `room-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a random user ID
 */
export function generateRandomUserId(): string {
  return `user-${Math.random().toString(36).substring(7)}`;
}
