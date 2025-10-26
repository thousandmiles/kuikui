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

  describe('removeUserFromRoom', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should remove user from room successfully', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user);
      const removedUser = roomService.removeUserFromRoom(roomId, user.id);

      expect(removedUser).toBeDefined();
      expect(removedUser?.id).toBe(user.id);
      expect(roomService.getUserInRoom(roomId, user.id)).toBeUndefined();
    });

    it('should return undefined for non-existent user', () => {
      const removedUser = roomService.removeUserFromRoom(roomId, 'non-existent');

      expect(removedUser).toBeUndefined();
    });

    it('should return undefined for non-existent room', () => {
      const removedUser = roomService.removeUserFromRoom('non-existent', 'user-1');

      expect(removedUser).toBeUndefined();
    });
  });

  describe('getUserInRoom', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should return user in room', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user);
      const foundUser = roomService.getUserInRoom(roomId, user.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(user.id);
      expect(foundUser?.nickname).toBe(user.nickname);
    });

    it('should return undefined for non-existent user', () => {
      const foundUser = roomService.getUserInRoom(roomId, 'non-existent');

      expect(foundUser).toBeUndefined();
    });

    it('should return undefined for non-existent room', () => {
      const foundUser = roomService.getUserInRoom('non-existent', 'user-1');

      expect(foundUser).toBeUndefined();
    });
  });

  describe('getUsersInRoom', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should return empty array for room with no users', () => {
      const users = roomService.getUsersInRoom(roomId);

      expect(users).toEqual([]);
    });

    it('should return all users in room', () => {
      const user1: User = {
        id: 'user-1',
        nickname: 'User1',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };
      const user2: User = {
        id: 'user-2',
        nickname: 'User2',
        socketId: 'socket-2',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user1);
      roomService.addUserToRoom(roomId, user2);

      const users = roomService.getUsersInRoom(roomId);

      expect(users.length).toBe(2);
      expect(users.find(u => u.id === user1.id)).toBeDefined();
      expect(users.find(u => u.id === user2.id)).toBeDefined();
    });

    it('should return empty array for non-existent room', () => {
      const users = roomService.getUsersInRoom('non-existent');

      expect(users).toEqual([]);
    });
  });

  describe('isUserInRoom', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should return true for user in room', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user);
      const inRoom = roomService.isUserInRoom(roomId, user.id);

      expect(inRoom).toBe(true);
    });

    it('should return false for user not in room', () => {
      const inRoom = roomService.isUserInRoom(roomId, 'non-existent');

      expect(inRoom).toBe(false);
    });

    it('should return false for non-existent room', () => {
      const inRoom = roomService.isUserInRoom('non-existent', 'user-1');

      expect(inRoom).toBe(false);
    });
  });

  describe('getRoomCapacityInfo', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should return capacity info for room', () => {
      const info = roomService.getRoomCapacityInfo(roomId);

      expect(info).toBeDefined();
      expect(info?.current).toBe(0);
      expect(info?.max).toBeGreaterThan(0);
    });

    it('should update current count when users join', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user);
      const info = roomService.getRoomCapacityInfo(roomId);

      expect(info?.current).toBe(1);
    });

    it('should return null for non-existent room', () => {
      const info = roomService.getRoomCapacityInfo('non-existent');

      expect(info).toBeNull();
    });
  });

  describe('updateUserInRoom', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should update user nickname and socketId', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'OldNickname',
        socketId: 'old-socket',
        joinedAt: new Date(),
        isOnline: false,
      };

      roomService.addUserToRoom(roomId, user);
      const result = roomService.updateUserInRoom(
        roomId,
        user.id,
        'NewNickname',
        'new-socket'
      );

      expect(result).toBe(true);

      const updatedUser = roomService.getUserInRoom(roomId, user.id);
      expect(updatedUser?.nickname).toBe('NewNickname');
      expect(updatedUser?.socketId).toBe('new-socket');
      expect(updatedUser?.isOnline).toBe(true);
    });

    it('should return false for non-existent room', () => {
      const result = roomService.updateUserInRoom(
        'non-existent',
        'user-1',
        'NewNickname',
        'new-socket'
      );

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', () => {
      const result = roomService.updateUserInRoom(
        roomId,
        'non-existent',
        'NewNickname',
        'new-socket'
      );

      expect(result).toBe(false);
    });
  });

  describe('isNicknameAvailableForUser', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should allow user to keep their own nickname', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user);
      const available = roomService.isNicknameAvailableForUser(
        roomId,
        'TestUser',
        user.id
      );

      expect(available).toBe(true);
    });

    it('should not allow nickname taken by another user', () => {
      const user1: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };
      const user2: User = {
        id: 'user-2',
        nickname: 'OtherUser',
        socketId: 'socket-2',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user1);
      roomService.addUserToRoom(roomId, user2);

      const available = roomService.isNicknameAvailableForUser(
        roomId,
        'TestUser',
        user2.id
      );

      expect(available).toBe(false);
    });

    it('should return false for non-existent room', () => {
      const available = roomService.isNicknameAvailableForUser(
        'non-existent',
        'TestUser',
        'user-1'
      );

      expect(available).toBe(false);
    });
  });

  describe('addMessage', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should add message to room', () => {
      const message = {
        id: 'msg-1',
        userId: 'user-1',
        nickname: 'TestUser',
        content: 'Hello, world!',
        timestamp: new Date(),
      };

      const result = roomService.addMessage(roomId, message);

      expect(result).toBe(true);

      const messages = roomService.getMessages(roomId);
      expect(messages.length).toBe(1);
      expect(messages[0]?.id).toBe(message.id);
      expect(messages[0]?.content).toBe(message.content);
    });

    it('should return false for non-existent room', () => {
      const message = {
        id: 'msg-1',
        userId: 'user-1',
        nickname: 'TestUser',
        content: 'Hello, world!',
        timestamp: new Date(),
      };

      const result = roomService.addMessage('non-existent', message);

      expect(result).toBe(false);
    });

    it('should limit messages to 100', () => {
      // Add 150 messages
      for (let i = 0; i < 150; i++) {
        const message = {
          id: `msg-${i}`,
          userId: 'user-1',
          nickname: 'TestUser',
          content: `Message ${i}`,
          timestamp: new Date(),
        };
        roomService.addMessage(roomId, message);
      }

      const messages = roomService.getMessages(roomId);
      expect(messages.length).toBe(100);
      // Should keep the last 100 messages
      expect(messages[0]?.id).toBe('msg-50');
      expect(messages[99]?.id).toBe('msg-149');
    });
  });

  describe('getMessages', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should return empty array for room with no messages', () => {
      const messages = roomService.getMessages(roomId);

      expect(messages).toEqual([]);
    });

    it('should return all messages in room', () => {
      const message1 = {
        id: 'msg-1',
        userId: 'user-1',
        nickname: 'User1',
        content: 'Hello',
        timestamp: new Date(),
      };
      const message2 = {
        id: 'msg-2',
        userId: 'user-2',
        nickname: 'User2',
        content: 'Hi',
        timestamp: new Date(),
      };

      roomService.addMessage(roomId, message1);
      roomService.addMessage(roomId, message2);

      const messages = roomService.getMessages(roomId);

      expect(messages.length).toBe(2);
      expect(messages[0]?.id).toBe(message1.id);
      expect(messages[1]?.id).toBe(message2.id);
    });

    it('should return empty array for non-existent room', () => {
      const messages = roomService.getMessages('non-existent');

      expect(messages).toEqual([]);
    });
  });

  describe('updateUserStatus', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should update user online status', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user);
      const result = roomService.updateUserStatus(roomId, user.id, false);

      expect(result).toBe(true);

      const updatedUser = roomService.getUserInRoom(roomId, user.id);
      expect(updatedUser?.isOnline).toBe(false);
    });

    it('should return false for non-existent room', () => {
      const result = roomService.updateUserStatus('non-existent', 'user-1', false);

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', () => {
      const result = roomService.updateUserStatus(roomId, 'non-existent', false);

      expect(result).toBe(false);
    });
  });

  describe('updateUserEditingStatus', () => {
    let roomId: string;

    beforeEach(() => {
      roomId = roomService.createRoom();
    });

    it('should update user editing status', () => {
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user);
      const result = roomService.updateUserEditingStatus(roomId, user.id, true);

      expect(result).toBe(true);

      const updatedUser = roomService.getUserInRoom(roomId, user.id);
      expect(updatedUser?.isEditing).toBe(true);
      expect(updatedUser?.lastActivity).toBeDefined();
    });

    it('should return false for non-existent room', () => {
      const result = roomService.updateUserEditingStatus(
        'non-existent',
        'user-1',
        true
      );

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', () => {
      const result = roomService.updateUserEditingStatus(
        roomId,
        'non-existent',
        true
      );

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredRooms', () => {
    it('should delete empty rooms', () => {
      const roomId = roomService.createRoom();

      const deletedCount = roomService.cleanupExpiredRooms(0);

      expect(deletedCount).toBeGreaterThanOrEqual(1);
      expect(roomService.roomExists(roomId)).toBe(false);
    });

    it('should not delete rooms with users', () => {
      const roomId = roomService.createRoom();
      const user: User = {
        id: 'user-1',
        nickname: 'TestUser',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId, user);
      roomService.cleanupExpiredRooms(0);

      expect(roomService.roomExists(roomId)).toBe(true);
    });

    it('should return count of deleted rooms', () => {
      roomService.createRoom();
      roomService.createRoom();
      roomService.createRoom();

      const deletedCount = roomService.cleanupExpiredRooms(0);

      expect(deletedCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getStats', () => {
    it('should return stats for empty service', () => {
      // Clean up any existing rooms first
      roomService.cleanupExpiredRooms(0);

      const stats = roomService.getStats();

      expect(stats.totalRooms).toBe(0);
      expect(stats.totalUsers).toBe(0);
    });

    it('should return correct stats with rooms and users', () => {
      // Clean up any existing rooms first
      roomService.cleanupExpiredRooms(0);

      const roomId1 = roomService.createRoom();
      const roomId2 = roomService.createRoom();

      const user1: User = {
        id: 'user-1',
        nickname: 'User1',
        socketId: 'socket-1',
        joinedAt: new Date(),
        isOnline: true,
      };
      const user2: User = {
        id: 'user-2',
        nickname: 'User2',
        socketId: 'socket-2',
        joinedAt: new Date(),
        isOnline: true,
      };

      roomService.addUserToRoom(roomId1, user1);
      roomService.addUserToRoom(roomId2, user2);

      const stats = roomService.getStats();

      expect(stats.totalRooms).toBe(2);
      expect(stats.totalUsers).toBe(2);
    });
  });
});
