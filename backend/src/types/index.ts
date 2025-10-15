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
  users: Map<string, User>;
  messages: ChatMessage[];
  ownerId?: string; // User ID of the room creator
  ownerNickname?: string; // Nickname of the room creator
  capacity: number; // Maximum number of users allowed in the room
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

export interface CreateRoomErrorResponse {
  roomId: string;
  roomLink: string;
  error: string;
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
  UNAUTHORIZED = 'UNAUTHORIZED',
}

export interface SocketError {
  code: SocketErrorCode;
  message: string;
  details?: Record<string, unknown>;
  recoverable?: boolean; // Hint for UI (e.g. can retry automatically)
}

// Editor-related types from README specification

export interface DocumentOperation {
  id: string;
  type: 'insert' | 'delete' | 'format' | 'structure' | 'save';
  userId: string;
  userNickname: string;
  userColor: string;
  timestamp: Date;
  position: { from: number; to: number };
  content?: unknown; // ProseMirror content
  metadata?: {
    formattingType?: 'bold' | 'italic' | 'heading' | 'list';
    contentPreview?: string;
  };
}

export interface EditorDocument {
  id: string;
  title: string;
  content: unknown; // ProseMirror JSON
  yDoc: unknown; // Y.js document
  lastModified: Date;
  modifiedBy: string;
  version: number;
  autoSaveEnabled: boolean;
}
