import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { roomService } from '../services/roomService';
import { User, ChatMessage, JoinRoomRequest, JoinRoomResponse } from '../types';
import logger from '../utils/logger';
import {
  validateNickname,
  validateMessage,
  validateRoomId,
  sanitizeInput,
  RateLimiter,
} from '../utils/validation';

export function setupSocketHandlers(io: SocketIOServer) {
  // Rate limiters for different actions
  const joinRoomLimiter = new RateLimiter(5, 60000); // 5 joins per minute
  const messageLimiter = new RateLimiter(30, 60000); // 30 messages per minute

  io.on('connection', (socket: Socket) => {
    logger.socket('user connected', socket.id);

    let currentUserId: string | null = null;
    let currentRoomId: string | null = null;

    // Handle joining a room
    socket.on('join-room', (data: JoinRoomRequest) => {
      try {
        // Rate limiting
        if (!joinRoomLimiter.isAllowed(socket.id)) {
          socket.emit('error', {
            message: 'Too many join attempts. Please wait before trying again.',
          });
          return;
        }

        const { roomId, nickname, userId: existingUserId } = data;

        // Validate room ID
        const roomIdValidation = validateRoomId(roomId);
        if (!roomIdValidation.isValid) {
          socket.emit('error', { message: roomIdValidation.error });
          return;
        }

        // Validate and sanitize nickname
        const nicknameValidation = validateNickname(nickname);
        if (!nicknameValidation.isValid) {
          socket.emit('error', { message: nicknameValidation.error });
          return;
        }

        const sanitizedNickname = sanitizeInput(nickname);

        // Check if the room exists
        if (!roomService.roomExists(roomId)) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Handle returning user with existing userId
        if (
          existingUserId &&
          roomService.isUserInRoom(roomId, existingUserId)
        ) {
          // User is returning to a room they were already in
          const existingUser = roomService.getUserInRoom(
            roomId,
            existingUserId
          );
          if (existingUser) {
            // Check if nickname conflicts with OTHER users (excluding self)
            if (
              !roomService.isNicknameAvailableForUser(
                roomId,
                sanitizedNickname,
                existingUserId
              )
            ) {
              socket.emit('error', {
                message: 'This nickname is already taken in this room',
              });
              return;
            }

            // For returning users, use the server's saved nickname instead of client's
            // This prevents unexpected nickname changes since we don't provide rename UI
            const serverNickname = existingUser.nickname;

            // Update existing user's socket ID (keep server's nickname)
            roomService.updateUserInRoom(
              roomId,
              existingUserId,
              serverNickname,
              socket.id
            );
            void socket.join(roomId);

            // Send current room state to returning user
            const users = roomService.getUsersInRoom(roomId);
            const messages = roomService.getMessages(roomId);
            const room = roomService.getRoom(roomId);
            const response: JoinRoomResponse = {
              success: true,
              users,
              messages,
              userId: existingUserId,
              ownerId: room?.ownerId,
              ownerNickname: room?.ownerNickname,
            };
            socket.emit('room-joined', response);

            logger.info(
              `User ${serverNickname} (${existingUserId}) rejoined room ${roomId}${
                nickname !== serverNickname
                  ? ` (client sent ${nickname}, using server's ${serverNickname})`
                  : ''
              }`
            );
            return;
          }
        }

        // Handle new user or user with new nickname
        if (!roomService.isNicknameAvailable(roomId, sanitizedNickname)) {
          socket.emit('error', {
            message: 'This nickname is already taken in this room',
          });
          return;
        }

        // Use existing userId or generate a new one
        const userId = existingUserId ?? uuidv4();

        // Create user object
        const user: User = {
          id: userId,
          nickname: sanitizedNickname,
          socketId: socket.id,
          joinedAt: new Date(),
          isOnline: true,
        };

        // Add user to room
        const success = roomService.addUserToRoom(roomId, user);
        if (!success) {
          socket.emit('error', { message: 'Failed to join room' });
          return;
        }

        // Join socket room
        void socket.join(roomId);
        currentUserId = userId;
        currentRoomId = roomId;

        // Get current room state
        const users = roomService.getUsersInRoom(roomId);
        const messages = roomService.getMessages(roomId);
        const room = roomService.getRoom(roomId);

        // Send response to the joining user
        const response: JoinRoomResponse = {
          success: true,
          users,
          messages,
          userId, // Include the userId in the response
          ownerId: room?.ownerId,
          ownerNickname: room?.ownerNickname,
        };
        socket.emit('room-joined', response);

        // Notify other users in the room
        socket.to(roomId).emit('user-joined', user);

        logger.info('User joined room via socket', {
          nickname,
          roomId,
          userId: user.id,
          socketId: socket.id,
        });
      } catch (error) {
        const { roomId: roomIdParam, nickname: nicknameParam } = data;
        logger.error('Error joining room', {
          error: error instanceof Error ? error.message : String(error),
          roomId: roomIdParam,
          nickname: nicknameParam,
          socketId: socket.id,
        });
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle sending messages
    socket.on('send-message', (data: { content: string }) => {
      try {
        // Rate limiting
        if (!messageLimiter.isAllowed(socket.id)) {
          socket.emit('error', {
            message: 'Too many messages. Please slow down.',
          });
          return;
        }

        if (!currentUserId || !currentRoomId) {
          socket.emit('error', { message: 'Not in a room' });
          return;
        }

        const { content } = data;

        // Validate message content
        const messageValidation = validateMessage(content);
        if (!messageValidation.isValid) {
          socket.emit('error', { message: messageValidation.error });
          return;
        }

        // Sanitize message content
        const sanitizedContent = sanitizeInput(content);

        // Get user info
        const users = roomService.getUsersInRoom(currentRoomId);
        const user = users.find(u => u.id === currentUserId);
        if (!user) {
          socket.emit('error', { message: 'User not found in room' });
          return;
        }

        // Create message
        const message: ChatMessage = {
          id: uuidv4(),
          userId: currentUserId,
          nickname: user.nickname,
          content: sanitizedContent,
          timestamp: new Date(),
        };

        // Add message to room
        roomService.addMessage(currentRoomId, message);

        // Broadcast message to all users in the room
        io.to(currentRoomId).emit('new-message', message);

        logger.info('Message sent', {
          roomId: currentRoomId,
          userId: currentUserId,
          nickname: user.nickname,
          messageId: message.id,
        });
      } catch (error) {
        logger.error('Error sending message', {
          error: error instanceof Error ? error.message : String(error),
          roomId: currentRoomId,
          userId: currentUserId,
          socketId: socket.id,
        });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing status
    socket.on('user-typing', (data: { isTyping: boolean }) => {
      try {
        if (!currentUserId || !currentRoomId) {
          return;
        }

        const users = roomService.getUsersInRoom(currentRoomId);
        const user = users.find(u => u.id === currentUserId);
        if (!user) {
          return;
        }

        // Broadcast typing status to other users in the room
        socket.to(currentRoomId).emit('user-typing-status', {
          userId: currentUserId,
          nickname: user.nickname,
          isTyping: data.isTyping,
        });
      } catch (error) {
        logger.error('Error handling typing status', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      try {
        logger.socket('user disconnected', socket.id);

        if (currentUserId && currentRoomId) {
          // Remove user from room
          const user = roomService.removeUserFromRoom(
            currentRoomId,
            currentUserId
          );

          if (user) {
            // Notify other users in the room
            socket.to(currentRoomId).emit('user-left', currentUserId);
            logger.info('User left room on disconnect', {
              nickname: user.nickname,
              roomId: currentRoomId,
              userId: currentUserId,
              socketId: socket.id,
            });
          }
        }
      } catch (error) {
        logger.error('Error handling disconnect', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });
  });

  // Cleanup rate limiters periodically
  setInterval(() => {
    joinRoomLimiter.cleanup();
    messageLimiter.cleanup();
  }, 300000); // Cleanup every 5 minutes
}
