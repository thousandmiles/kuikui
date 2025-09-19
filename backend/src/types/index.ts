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

export interface JoinRoomRequest {
  roomId: string;
  nickname: string;
}

export interface JoinRoomResponse {
  success: boolean;
  users: User[];
  messages: ChatMessage[];
  error?: string;
}

export interface SocketEvents {
  // Client to server
  'join-room': (data: JoinRoomRequest) => void;
  'send-message': (data: { content: string }) => void;
  'user-typing': (data: { isTyping: boolean }) => void;
  disconnect: () => void;

  // Server to client
  'room-joined': (data: JoinRoomResponse) => void;
  'user-joined': (user: User) => void;
  'user-left': (userId: string) => void;
  'new-message': (message: ChatMessage) => void;
  'user-typing-status': (data: {
    userId: string;
    nickname: string;
    isTyping: boolean;
  }) => void;
  error: (data: { message: string }) => void;
}
