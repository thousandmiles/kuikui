import { describe, it, expect, beforeEach } from 'vitest';
import { roomService } from '../../../src/services/roomService';
import { User } from '../../../src/types';

describe('RoomService', () => {
  describe('createRoom', () => {
    it('should create a new room with a unique ID', () => {
      const roomId = roomService.createRoom();

      expect(roomId).toBeDefined();
      expect(typeof roomId).toBe('string');
      expect(roomId.length).toBeGreaterThan(0);
    });

    it('should create a room that exists in the service', () => {
      const roomId = roomService.createRoom();
      const exists = roomService.roomExists(roomId);

      expect(exists).toBe(true);
    });

    it('should create rooms with unique IDs', () => {
      const roomId1 = roomService.createRoom();
      const roomId2 = roomService.createRoom();

      expect(roomId1).not.toBe(roomId2);
    });
  });

  describe('getRoom', () => {
    it('should return undefined for non-existent room', () => {
      const room = roomService.getRoom('non-existent-room');

      expect(room).toBeUndefined();
    });

    it('should return the room for existing room ID', () => {
      const roomId = roomService.createRoom();
      const room = roomService.getRoom(roomId);

      expect(room).toBeDefined();
      expect(room?.id).toBe(roomId);
      expect(room?.users).toBeInstanceOf(Map);
      expect(room?.messages).toBeInstanceOf(Array);
    });
  });

  describe('roomExists', () => {
    it('should return false for non-existent room', () => {
      const exists = roomService.roomExists('non-existent-room');

      expect(exists).toBe(false);
    });

    it('should return true for existing room', () => {
      const roomId = roomService.createRoom();
      const exists = roomService.roomExists(roomId);

      expect(exists).toBe(true);
    });
  });

  describe('hasCapacity', () => {
    it('should return false for non-existent room', () => {
      const hasCapacity = roomService.hasCapacity('non-existent-room');

      expect(hasCapacity).toBe(false);
    });

    it('should return true for empty room', () => {
      const roomId = roomService.createRoom();
      const hasCapacity = roomService.hasCapacity(roomId);

      expect(hasCapacity).toBe(true);
    });

    it('should return false when room is at capacity', () => {
      const roomId = roomService.createRoom();
      const room = roomService.getRoom(roomId);

      // Fill room to capacity
      if (room) {
        for (let i = 0; i < room.capacity; i++) {
          const user: User = {
            id: `user-${i}`,
            nickname: `User${i}`,
            socketId: `socket-${i}`,
            joinedAt: new Date(),
            isOnline: true,
            lastActivity: new Date(),
          };
          roomService.addUserToRoom(roomId, user);
        }
      }

      const hasCapacity = roomService.hasCapacity(roomId);

      expect(hasCapacity).toBe(false);
    });
  });

  describe('isNicknameAvailable', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should return true for available nickname in empty room', () => {
      const available = roomService.isNicknameAvailable(roomId, 'TestUser');

      expect(available).toBe(true);
    });

    it('should return false for taken nickname (case-insensitive)', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };
      roomService.addUserToRoom(roomId, user);

      expect(roomService.isNicknameAvailable(roomId, 'TestUser')).toBe(false);
      expect(roomService.isNicknameAvailable(roomId, 'testuser')).toBe(false);
      expect(roomService.isNicknameAvailable(roomId, 'TESTUSER')).toBe(false);
    });

    it('should return true for available nickname', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };
      roomService.addUserToRoom(roomId, user);

      const available = roomService.isNicknameAvailable(roomId, 'OtherUser');

      expect(available).toBe(true);
    });

    it('should return false for non-existent room', () => {
      const available = roomService.isNicknameAvailable(
        'non-existent',
        'TestUser'
      );

      expect(available).toBe(false);
    });
  });

  describe('addUserToRoom', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should add user to room successfully', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      const result = roomService.addUserToRoom(roomId, user);

      expect(result).toBe(true);
      expect(roomService.getUserInRoom(roomId, user.id)).toBeDefined();
    });

    it('should return false if room does not exist', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      const result = roomService.addUserToRoom('non-existent', user);

      expect(result).toBe(false);
    });

    it('should set first user as room owner', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user);
      const room = roomService.getRoom(roomId);

      expect(room?.ownerId).toBe(user.id);
      expect(room?.ownerNickname).toBe(user.nickname);
    });
  });
});
