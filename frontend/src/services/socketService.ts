import { io, Socket } from 'socket.io-client';
import {
  JoinRoomRequest,
  JoinRoomResponse,
  User,
  ChatMessage,
  TypingStatus,
  SocketError,
  SocketErrorCode,
  SocketLifecycleEvent,
} from '../types/index.js';
import { frontendConfig } from '../config/environment.js';
import logger from '../utils/logger.js';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();
  private readonly defaultServerUrl: string;

  constructor() {
    this.defaultServerUrl = frontendConfig.WEBSOCKET_URL;
    logger.socket('initialized', 'SocketService with WebSocket URL', {
      url: this.defaultServerUrl,
    });
  }

  connect(serverUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = serverUrl ?? this.defaultServerUrl;
        this.socket = io(url, {
          transports: ['websocket'],
          upgrade: true,
        });

        this.emit('lifecycle', 'connecting' as SocketLifecycleEvent);
        let hasConnectedOnce = false;

        this.socket.on('connect', () => {
          logger.socket('connect', 'Connected to server');
          if (!hasConnectedOnce) {
            this.emit('lifecycle', 'connected' as SocketLifecycleEvent);
            hasConnectedOnce = true;
          } else {
            this.emit('lifecycle', 'reconnected' as SocketLifecycleEvent);
          }
          resolve();
        });

        this.socket.on('connect_error', error => {
          const message =
            error instanceof Error ? error.message : String(error);
          logger.error('Socket connection error', { error: message, url });
          const structured: SocketError = {
            code: SocketErrorCode.INTERNAL_ERROR,
            message: 'Failed to connect to server',
            details: { raw: message, url },
            recoverable: true,
          };
          this.emit('error', structured);
          this.emit('lifecycle', 'connection_error' as SocketLifecycleEvent);
          reject(error);
        });

        this.socket.on('disconnect', reason => {
          logger.socket('disconnect', 'Disconnected from server');
          const structured: SocketError = {
            code: SocketErrorCode.DISCONNECTED,
            message: 'Disconnected from server',
            details: { reason },
            recoverable: true,
          };
          this.emit('error', structured);
          this.emit('lifecycle', 'disconnected' as SocketLifecycleEvent);
        });

        this.socket.io.on('reconnect_attempt', attempt => {
          this.emit('lifecycle', 'reconnecting' as SocketLifecycleEvent);
          logger.socket(
            'reconnect_attempt',
            `Reconnecting (attempt ${attempt})`
          );
        });

        this.socket.io.on('reconnect', attempt => {
          logger.socket('reconnect', `Reconnected after ${attempt} attempts`);
          this.emit('lifecycle', 'reconnected' as SocketLifecycleEvent);
        });

        this.socket.io.on('reconnect_error', error => {
          const msg = error instanceof Error ? error.message : String(error);
          const structured: SocketError = {
            code: SocketErrorCode.RECONNECT_FAILED,
            message: 'Reconnection attempt failed',
            details: { raw: msg },
            recoverable: true,
          };
          this.emit('error', structured);
          this.emit('lifecycle', 'connection_error' as SocketLifecycleEvent);
        });

        // Set up event listeners
        this.setupEventListeners();
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventListeners() {
    if (!this.socket) {
      return;
    }

    this.socket.on('room-joined', (data: JoinRoomResponse) => {
      this.emit('room-joined', data);
    });

    this.socket.on('user-joined', (user: User) => {
      this.emit('user-joined', user);
    });

    this.socket.on('user-left', (userId: string) => {
      this.emit('user-left', userId);
    });

    this.socket.on('new-message', (message: ChatMessage) => {
      this.emit('new-message', message);
    });

    this.socket.on('user-typing-status', (status: TypingStatus) => {
      this.emit('user-typing-status', status);
    });

    this.socket.on('error', (data: { message: string; code?: string }) => {
      // Normalize to SocketError
      const incomingCode = data.code as SocketErrorCode | undefined;
      const structured: SocketError = {
        code: incomingCode ? incomingCode : SocketErrorCode.INTERNAL_ERROR,
        message: data.message || 'Unknown socket error',
      };
      this.emit('error', structured);
    });
  }

  joinRoom(roomId: string, nickname: string, userId?: string) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    const data: JoinRoomRequest = { roomId, nickname, userId };
    this.socket.emit('join-room', data);
  }

  sendMessage(content: string) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('send-message', { content });
  }

  sendTypingStatus(isTyping: boolean) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('user-typing', { isTyping });
  }

  // Event listener management
  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: unknown) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
