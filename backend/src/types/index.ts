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
  error?: string;
}
