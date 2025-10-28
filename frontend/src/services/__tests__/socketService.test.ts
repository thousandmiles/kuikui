/**
 * @fileoverview Comprehensive test suite for SocketService
 * 
 * Tests real-time WebSocket communication service including:
 * - Connection and disconnection lifecycle
 * - Event listener management (on, off, emit)
 * - Room joining and message sending
 * - Typing and editing status updates
 * - Error handling and reconnection logic
 * - Collaborative editor events
 * - Socket state validation
 * 
 * @see {@link SocketService} for implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Socket } from 'socket.io-client';
import type {
  JoinRoomResponse,
  User,
  ChatMessage,
  TypingStatus,
  SocketError,
  SocketErrorCode,
} from '../../types';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  io: {
    on: vi.fn(),
    off: vi.fn(),
  },
};

const mockIo = vi.fn(() => mockSocket as unknown as Socket);

vi.mock('socket.io-client', () => ({
  io: (url: string, options: unknown) => mockIo(url, options),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    socket: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock environment config
vi.mock('../../config/environment', () => ({
  frontendConfig: {
    WEBSOCKET_URL: 'http://localhost:3001',
    API_BASE_URL: 'http://localhost:3001/api',
    FRONTEND_URL: 'http://localhost:5174',
  },
}));

describe('SocketService', () => {
  let SocketService: typeof import('../socketService').SocketService;
  let socketService: import('../socketService').SocketService;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    mockSocket.connected = false;
    
    // Reset the module to get a fresh instance
    vi.resetModules();
    
    // Import fresh instance
    const module = await import('../socketService');
    SocketService = module.SocketService;
    socketService = new SocketService();
  });

  afterEach(() => {
    // Clean up
    if (socketService) {
      socketService.disconnect();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default server URL', () => {
      expect(socketService).toBeDefined();
      expect(socketService.isConnected()).toBe(false);
    });

    it('should not create socket connection on construction', () => {
      expect(mockIo).not.toHaveBeenCalled();
    });
  });

  describe('connect', () => {
    it('should connect to default WebSocket URL', async () => {
      // Simulate successful connection
      mockIo.mockReturnValue(mockSocket as unknown as Socket);
      
      const connectPromise = socketService.connect();
      
      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();

      await connectPromise;

      expect(mockIo).toHaveBeenCalledWith('http://localhost:3001', {
        transports: ['websocket'],
        upgrade: true,
      });
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should connect to custom server URL', async () => {
      const customUrl = 'http://custom-server:3002';
      
      const connectPromise = socketService.connect(customUrl);
      
      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();

      await connectPromise;

      expect(mockIo).toHaveBeenCalledWith(customUrl, {
        transports: ['websocket'],
        upgrade: true,
      });
    });

    it('should emit lifecycle event when connecting', async () => {
      const lifecycleCallback = vi.fn();
      socketService.on('lifecycle', lifecycleCallback);

      const connectPromise = socketService.connect();

      expect(lifecycleCallback).toHaveBeenCalledWith('connecting');

      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();

      await connectPromise;
    });

    it('should emit "connected" lifecycle event on first connection', async () => {
      const lifecycleCallback = vi.fn();
      socketService.on('lifecycle', lifecycleCallback);

      const connectPromise = socketService.connect();

      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();

      await connectPromise;

      expect(lifecycleCallback).toHaveBeenCalledWith('connected');
    });

    it('should handle connection errors', async () => {
      const errorCallback = vi.fn();
      socketService.on('error', errorCallback);

      const connectPromise = socketService.connect();

      // Simulate connection error
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];
      const testError = new Error('Connection failed');
      errorHandler?.(testError);

      await expect(connectPromise).rejects.toThrow('Connection failed');
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle disconnect event', async () => {
      const errorCallback = vi.fn();
      socketService.on('error', errorCallback);

      const connectPromise = socketService.connect();

      // First connect
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();

      await connectPromise;

      // Then disconnect
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];
      disconnectHandler?.('transport close');

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Disconnected from server',
          recoverable: true,
        })
      );
    });

    it('should set up event listeners after connection', async () => {
      const connectPromise = socketService.connect();

      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();

      await connectPromise;

      // Verify all event listeners are set up
      expect(mockSocket.on).toHaveBeenCalledWith('room-joined', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user-joined', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user-left', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('new-message', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user-typing-status', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('user-editing-status', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('Event Listeners', () => {
    beforeEach(async () => {
      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;
    });

    it('should handle room-joined event', () => {
      const callback = vi.fn();
      socketService.on('room-joined', callback);

      const roomJoinedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'room-joined'
      )?.[1];

      const mockData: JoinRoomResponse = {
        roomId: 'room-123',
        userId: 'user-123',
        nickname: 'TestUser',
        users: [],
        messages: [],
        ownerId: 'user-123',
        ownerNickname: 'TestUser',
      };

      roomJoinedHandler?.(mockData);
      expect(callback).toHaveBeenCalledWith(mockData);
    });

    it('should handle user-joined event', () => {
      const callback = vi.fn();
      socketService.on('user-joined', callback);

      const userJoinedHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'user-joined'
      )?.[1];

      const mockUser: User = {
        id: 'user-456',
        nickname: 'NewUser',
        socketId: 'socket-456',
        joinedAt: new Date(),
        isOnline: true,
      };

      userJoinedHandler?.(mockUser);
      expect(callback).toHaveBeenCalledWith(mockUser);
    });

    it('should handle user-left event', () => {
      const callback = vi.fn();
      socketService.on('user-left', callback);

      const userLeftHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'user-left'
      )?.[1];

      userLeftHandler?.('user-789');
      expect(callback).toHaveBeenCalledWith('user-789');
    });

    it('should handle new-message event', () => {
      const callback = vi.fn();
      socketService.on('new-message', callback);

      const newMessageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'new-message'
      )?.[1];

      const mockMessage: ChatMessage = {
        id: 'msg-1',
        userId: 'user-123',
        nickname: 'TestUser',
        content: 'Hello, world!',
        timestamp: new Date(),
      };

      newMessageHandler?.(mockMessage);
      expect(callback).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle user-typing-status event', () => {
      const callback = vi.fn();
      socketService.on('user-typing-status', callback);

      const typingStatusHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'user-typing-status'
      )?.[1];

      const mockStatus: TypingStatus = {
        userId: 'user-123',
        nickname: 'TestUser',
        isTyping: true,
      };

      typingStatusHandler?.(mockStatus);
      expect(callback).toHaveBeenCalledWith(mockStatus);
    });

    it('should handle user-editing-status event', () => {
      const callback = vi.fn();
      socketService.on('user-editing-status', callback);

      const editingStatusHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'user-editing-status'
      )?.[1];

      const mockStatus = {
        userId: 'user-123',
        nickname: 'TestUser',
        isEditing: true,
      };

      editingStatusHandler?.(mockStatus);
      expect(callback).toHaveBeenCalledWith(mockStatus);
    });

    it('should handle error event from server', () => {
      const callback = vi.fn();
      socketService.on('error', callback);

      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      errorHandler?.({ message: 'Test error', code: 'VALIDATION' });
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
        })
      );
    });

    it('should handle editor:document-update event', () => {
      const callback = vi.fn();
      socketService.on('editor:document-update', callback);

      const handler = mockSocket.on.mock.calls.find(
        call => call[0] === 'editor:document-update'
      )?.[1];

      const mockUpdate = {
        update: new Uint8Array([1, 2, 3]),
        userId: 'user-123',
      };

      handler?.(mockUpdate);
      expect(callback).toHaveBeenCalledWith(mockUpdate);
    });

    it('should handle editor:awareness-update event', () => {
      const callback = vi.fn();
      socketService.on('editor:awareness-update', callback);

      const handler = mockSocket.on.mock.calls.find(
        call => call[0] === 'editor:awareness-update'
      )?.[1];

      const mockAwareness = {
        awareness: new Uint8Array([4, 5, 6]),
        userId: 'user-123',
      };

      handler?.(mockAwareness);
      expect(callback).toHaveBeenCalledWith(mockAwareness);
    });

    it('should handle editor:activity event', () => {
      const callback = vi.fn();
      socketService.on('editor:activity', callback);

      const handler = mockSocket.on.mock.calls.find(
        call => call[0] === 'editor:activity'
      )?.[1];

      const mockActivity = {
        kind: 'edit' as const,
        ts: new Date().toISOString(),
        userId: 'user-123',
      };

      handler?.(mockActivity);
      expect(callback).toHaveBeenCalledWith(mockActivity);
    });
  });

  describe('joinRoom', () => {
    beforeEach(async () => {
      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;
      mockSocket.connected = true;
    });

    it('should emit join-room event with correct data', () => {
      socketService.joinRoom('room-123', 'TestUser', 'user-123');

      expect(mockSocket.emit).toHaveBeenCalledWith('join-room', {
        roomId: 'room-123',
        nickname: 'TestUser',
        userId: 'user-123',
      });
    });

    it('should emit join-room event without userId', () => {
      socketService.joinRoom('room-456', 'AnotherUser');

      expect(mockSocket.emit).toHaveBeenCalledWith('join-room', {
        roomId: 'room-456',
        nickname: 'AnotherUser',
        userId: undefined,
      });
    });

    it('should throw error when not connected', () => {
      socketService.disconnect();

      expect(() => {
        socketService.joinRoom('room-123', 'TestUser');
      }).toThrow('Socket not connected');
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;
      mockSocket.connected = true;
    });

    it('should emit send-message event', () => {
      socketService.sendMessage('Hello, world!');

      expect(mockSocket.emit).toHaveBeenCalledWith('send-message', {
        content: 'Hello, world!',
      });
    });

    it('should throw error when not connected', () => {
      socketService.disconnect();

      expect(() => {
        socketService.sendMessage('Hello');
      }).toThrow('Socket not connected');
    });
  });

  describe('sendTypingStatus', () => {
    beforeEach(async () => {
      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;
      mockSocket.connected = true;
    });

    it('should emit user-typing event with true', () => {
      socketService.sendTypingStatus(true);

      expect(mockSocket.emit).toHaveBeenCalledWith('user-typing', {
        isTyping: true,
      });
    });

    it('should emit user-typing event with false', () => {
      socketService.sendTypingStatus(false);

      expect(mockSocket.emit).toHaveBeenCalledWith('user-typing', {
        isTyping: false,
      });
    });

    it('should throw error when not connected', () => {
      socketService.disconnect();

      expect(() => {
        socketService.sendTypingStatus(true);
      }).toThrow('Socket not connected');
    });
  });

  describe('sendEditingStatus', () => {
    beforeEach(async () => {
      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;
      mockSocket.connected = true;
    });

    it('should emit user-editing event with true', () => {
      socketService.sendEditingStatus(true);

      expect(mockSocket.emit).toHaveBeenCalledWith('user-editing', {
        isEditing: true,
      });
    });

    it('should emit user-editing event with false', () => {
      socketService.sendEditingStatus(false);

      expect(mockSocket.emit).toHaveBeenCalledWith('user-editing', {
        isEditing: false,
      });
    });

    it('should throw error when not connected', () => {
      socketService.disconnect();

      expect(() => {
        socketService.sendEditingStatus(true);
      }).toThrow('Socket not connected');
    });
  });

  describe('Editor Methods', () => {
    beforeEach(async () => {
      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;
      mockSocket.connected = true;
    });

    it('should send document update', () => {
      const update = new Uint8Array([1, 2, 3, 4]);
      socketService.sendDocumentUpdate(update);

      expect(mockSocket.emit).toHaveBeenCalledWith('editor:document-update', {
        update,
      });
    });

    it('should send awareness update', () => {
      const awareness = new Uint8Array([5, 6, 7, 8]);
      socketService.sendAwarenessUpdate(awareness);

      expect(mockSocket.emit).toHaveBeenCalledWith('editor:awareness-update', {
        awareness,
      });
    });

    it('should send editor activity - edit', () => {
      socketService.sendEditorActivity('edit');

      expect(mockSocket.emit).toHaveBeenCalledWith('editor:activity', {
        kind: 'edit',
      });
    });

    it('should send editor activity - save', () => {
      socketService.sendEditorActivity('save');

      expect(mockSocket.emit).toHaveBeenCalledWith('editor:activity', {
        kind: 'save',
      });
    });

    it('should send editor activity - presence', () => {
      socketService.sendEditorActivity('presence');

      expect(mockSocket.emit).toHaveBeenCalledWith('editor:activity', {
        kind: 'presence',
      });
    });

    it('should send document save', () => {
      socketService.sendDocumentSave('doc-123', { text: 'content' }, 'My Document');

      expect(mockSocket.emit).toHaveBeenCalledWith('editor:document-save', {
        documentId: 'doc-123',
        content: { text: 'content' },
        title: 'My Document',
      });
    });

    it('should throw error when sending document update while not connected', () => {
      socketService.disconnect();

      expect(() => {
        socketService.sendDocumentUpdate(new Uint8Array([1]));
      }).toThrow('Socket not connected');
    });
  });

  describe('Event Management (on, off, emit)', () => {
    it('should add event listener', () => {
      const callback = vi.fn();
      socketService.on('test-event', callback);

      // Manually trigger emit to test
      (socketService as any).emit('test-event', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should add multiple listeners to same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      socketService.on('test-event', callback1);
      socketService.on('test-event', callback2);

      (socketService as any).emit('test-event', 'data');

      expect(callback1).toHaveBeenCalledWith('data');
      expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should remove event listener', () => {
      const callback = vi.fn();
      socketService.on('test-event', callback);
      socketService.off('test-event', callback);

      (socketService as any).emit('test-event', 'data');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle removing non-existent listener', () => {
      const callback = vi.fn();

      expect(() => {
        socketService.off('non-existent', callback);
      }).not.toThrow();
    });

    it('should not call removed listener', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      socketService.on('test-event', callback1);
      socketService.on('test-event', callback2);
      socketService.off('test-event', callback1);

      (socketService as any).emit('test-event', 'data');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith('data');
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;
      mockSocket.connected = true;
    });

    it('should disconnect socket', () => {
      socketService.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should clear all listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      socketService.on('event1', callback1);
      socketService.on('event2', callback2);

      socketService.disconnect();

      (socketService as any).emit('event1', 'data');
      (socketService as any).emit('event2', 'data');

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should set socket to null', () => {
      socketService.disconnect();

      expect(() => {
        socketService.sendMessage('test');
      }).toThrow('Socket not connected');
    });

    it('should handle disconnect when not connected', () => {
      socketService.disconnect();
      
      expect(() => {
        socketService.disconnect();
      }).not.toThrow();
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(socketService.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      mockSocket.connected = true;
      connectHandler?.();
      await connectPromise;

      expect(socketService.isConnected()).toBe(true);
    });

    it('should return false after disconnect', async () => {
      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      mockSocket.connected = true;
      connectHandler?.();
      await connectPromise;

      mockSocket.connected = false;
      socketService.disconnect();

      expect(socketService.isConnected()).toBe(false);
    });
  });

  describe('Reconnection Scenarios', () => {
    it('should handle reconnection attempts', async () => {
      const lifecycleCallback = vi.fn();
      socketService.on('lifecycle', lifecycleCallback);

      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;

      // Simulate reconnection attempt
      const reconnectAttemptHandler = mockSocket.io.on.mock.calls.find(
        call => call[0] === 'reconnect_attempt'
      )?.[1];
      reconnectAttemptHandler?.(1);

      expect(lifecycleCallback).toHaveBeenCalledWith('reconnecting');
    });

    it('should emit "reconnected" on successful reconnection', async () => {
      const lifecycleCallback = vi.fn();
      socketService.on('lifecycle', lifecycleCallback);

      // First connection
      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;

      lifecycleCallback.mockClear();

      // Reconnection (hasConnectedOnce is true)
      connectHandler?.();

      expect(lifecycleCallback).toHaveBeenCalledWith('reconnected');
    });

    it('should handle reconnection errors', async () => {
      const errorCallback = vi.fn();
      socketService.on('error', errorCallback);

      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;

      // Simulate reconnection error
      const reconnectErrorHandler = mockSocket.io.on.mock.calls.find(
        call => call[0] === 'reconnect_error'
      )?.[1];
      reconnectErrorHandler?.(new Error('Reconnection failed'));

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Reconnection attempt failed',
          recoverable: true,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should normalize server error without code', async () => {
      const errorCallback = vi.fn();
      socketService.on('error', errorCallback);

      const connectPromise = socketService.connect();
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      connectHandler?.();
      await connectPromise;

      // Simulate error without code
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      errorHandler?.({ message: 'Unknown error' });

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Unknown error',
        })
      );
    });

    it('should handle connect_error with non-Error object', async () => {
      const errorCallback = vi.fn();
      socketService.on('error', errorCallback);

      const connectPromise = socketService.connect();

      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];
      errorHandler?.('String error');

      await expect(connectPromise).rejects.toBeDefined();
      expect(errorCallback).toHaveBeenCalled();
    });
  });
});
