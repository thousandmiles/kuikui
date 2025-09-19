import { io, Socket } from 'socket.io-client';
import {
  JoinRoomRequest,
  JoinRoomResponse,
  User,
  ChatMessage,
  TypingStatus,
} from '../types/index.js';
import { frontendConfig } from '../config/environment.js';
import logger from '../utils/logger.js';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
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
        const url = serverUrl || this.defaultServerUrl;
        this.socket = io(url, {
          transports: ['websocket'],
          upgrade: true,
        });

        this.socket.on('connect', () => {
          logger.socket('connect', 'Connected to server');
          resolve();
        });

        this.socket.on('connect_error', error => {
          logger.error('Socket connection error', {
            error: error instanceof Error ? error.message : String(error),
            url,
          });
          reject(error);
        });

        this.socket.on('disconnect', () => {
          logger.socket('disconnect', 'Disconnected from server');
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

    this.socket.on('error', (data: { message: string }) => {
      this.emit('error', data);
    });
  }

  joinRoom(roomId: string, nickname: string) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    const data: JoinRoomRequest = { roomId, nickname };
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
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
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
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
