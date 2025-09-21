export interface User {
  id: string;
  nickname: string;
  socketId: string;
  joinedAt: Date;
  isOnline: boolean;
}

export interface Room {
  id: string;
  createdAt: Date;
  lastActivity: Date;
  users: User[];
  messages: ChatMessage[];
  ownerId?: string;
  ownerNickname?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: Date;
}

export interface CreateRoomResponse {
  roomId: string;
  roomLink: string;
}

export interface JoinRoomRequest {
  roomId: string;
  nickname: string;
  userId?: string; // Optional: for user persistence across sessions
}

export interface JoinRoomResponse {
  success: boolean;
  users: User[];
  messages: ChatMessage[];
  userId?: string; // The user's ID (new or existing)
  ownerId?: string; // Room owner's user ID
  ownerNickname?: string; // Room owner's nickname
  capacity?: {
    current: number;
    max: number;
  };
  error?: string;
}

export interface TypingStatus {
  userId: string;
  nickname: string;
  isTyping: boolean;
}

// --- Socket Error Handling (shared contract) ---
export enum SocketErrorCode {
  VALIDATION = 'VALIDATION',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  NICKNAME_TAKEN = 'NICKNAME_TAKEN',
  RATE_LIMITED = 'RATE_LIMITED',
  NOT_IN_ROOM = 'NOT_IN_ROOM',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  JOIN_FAILED = 'JOIN_FAILED',
  MESSAGE_FAILED = 'MESSAGE_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECT_FAILED = 'RECONNECT_FAILED',
}

export interface SocketError {
  code: SocketErrorCode;
  message: string;
  details?: Record<string, unknown>;
  recoverable?: boolean;
}

// Client + (optional future server) lifecycle events for connection state
export type SocketLifecycleEvent =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'reconnected'
  | 'connection_error'
  | 'disconnected';
