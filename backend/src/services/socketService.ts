import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { roomService } from '../services/roomService';
import {
  User,
  ChatMessage,
  JoinRoomRequest,
  JoinRoomResponse,
  SocketErrorCode,
} from '../types';
import { createSocketError, emitSocketError } from '../utils/socketErrors';
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
    socket.on('join-room', (raw: unknown) => {
      try {
        // Basic payload shape guard
        const data =
          typeof raw === 'object' && raw !== null
            ? (raw as JoinRoomRequest)
            : ({} as JoinRoomRequest);
        if (
          typeof data.roomId !== 'string' ||
          typeof data.nickname !== 'string'
        ) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.VALIDATION,
              'Invalid join-room payload'
            )
          );
          return;
        }
        // Rate limiting
        if (!joinRoomLimiter.isAllowed(socket.id)) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.RATE_LIMITED,
              'Too many join attempts. Please wait before trying again.'
            )
          );
          return;
        }

        const { roomId, nickname, userId: existingUserId } = data;

        // Validate room ID
        const roomIdValidation = validateRoomId(roomId);
        if (!roomIdValidation.isValid) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.VALIDATION,
              roomIdValidation.error ?? 'Invalid room id'
            )
          );
          return;
        }

        // Validate and sanitize nickname
        const nicknameValidation = validateNickname(nickname);
        if (!nicknameValidation.isValid) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.VALIDATION,
              nicknameValidation.error ?? 'Invalid nickname'
            )
          );
          return;
        }

        const sanitizedNickname = sanitizeInput(nickname);

        // Check if the room exists
        if (!roomService.roomExists(roomId)) {
          emitSocketError(
            socket,
            createSocketError(SocketErrorCode.ROOM_NOT_FOUND, 'Room not found')
          );
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
              emitSocketError(
                socket,
                createSocketError(
                  SocketErrorCode.NICKNAME_TAKEN,
                  'This nickname is already taken in this room'
                )
              );
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

            // IMPORTANT: mark this socket's current user + room so later events (send-message, typing, disconnect)
            currentUserId = existingUserId;
            currentRoomId = roomId;

            // Send current room state to returning user
            const users = roomService.getUsersInRoom(roomId);
            const messages = roomService.getMessages(roomId);
            const room = roomService.getRoom(roomId);
            const capacityInfo = roomService.getRoomCapacityInfo(roomId);
            const response: JoinRoomResponse = {
              success: true,
              users,
              messages,
              userId: existingUserId,
              ownerId: room?.ownerId,
              ownerNickname: room?.ownerNickname,
              capacity: capacityInfo ?? undefined,
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
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.NICKNAME_TAKEN,
              'This nickname is already taken in this room'
            )
          );
          return;
        }

        // Check if room has capacity for new user (only for truly new users)
        if (!existingUserId && !roomService.hasCapacity(roomId)) {
          const capacityInfo = roomService.getRoomCapacityInfo(roomId);
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.ROOM_FULL,
              `Room is full (${capacityInfo?.current}/${capacityInfo?.max} users)`
            )
          );
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
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.JOIN_FAILED,
              'Failed to join room'
            )
          );
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
        const capacityInfo = roomService.getRoomCapacityInfo(roomId);
        const response: JoinRoomResponse = {
          success: true,
          users,
          messages,
          userId, // Include the userId in the response
          ownerId: room?.ownerId,
          ownerNickname: room?.ownerNickname,
          capacity: capacityInfo ?? undefined,
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
        logger.error('Error joining room', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
        });
        emitSocketError(
          socket,
          createSocketError(
            SocketErrorCode.JOIN_FAILED,
            'Failed to join room',
            { raw: error instanceof Error ? error.message : String(error) }
          )
        );
      }
    });

    // Handle sending messages
    socket.on('send-message', (raw: unknown) => {
      try {
        const data =
          typeof raw === 'object' && raw !== null
            ? (raw as { content?: string })
            : {};
        if (typeof data.content !== 'string') {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.VALIDATION,
              'Invalid send-message payload'
            )
          );
          return;
        }
        // Rate limiting
        if (!messageLimiter.isAllowed(socket.id)) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.RATE_LIMITED,
              'Too many messages. Please slow down.'
            )
          );
          return;
        }

        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(SocketErrorCode.NOT_IN_ROOM, 'Not in a room')
          );
          return;
        }

        const { content } = data;

        // Validate message content
        const messageValidation = validateMessage(content);
        if (!messageValidation.isValid) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.VALIDATION,
              messageValidation.error ?? 'Invalid message'
            )
          );
          return;
        }

        // Sanitize message content
        const sanitizedContent = sanitizeInput(content);

        // Get user info
        const users = roomService.getUsersInRoom(currentRoomId);
        const user = users.find(u => u.id === currentUserId);
        if (!user) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.USER_NOT_FOUND,
              'User not found in room'
            )
          );
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
        emitSocketError(
          socket,
          createSocketError(
            SocketErrorCode.MESSAGE_FAILED,
            'Failed to send message',
            { raw: error instanceof Error ? error.message : String(error) }
          )
        );
      }
    });

    // Handle typing status
    socket.on('user-typing', (raw: unknown) => {
      try {
        const data =
          typeof raw === 'object' && raw !== null
            ? (raw as { isTyping?: unknown })
            : {};
        const isTyping =
          typeof data.isTyping === 'boolean' ? data.isTyping : false;
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
          isTyping,
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

    // Handle editor document changes (for Y.js collaboration)
    socket.on('editor:document-update', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before updating document'
            )
          );
          return;
        }

        // Basic validation - Y.js will handle the actual document sync
        const data = raw as { update?: Uint8Array };

        if (!data.update) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.VALIDATION,
              'Invalid document update payload'
            )
          );
          return;
        }

        // Broadcast to other users in the room (except sender)
        socket.to(currentRoomId).emit('editor:document-update', {
          update: data.update,
          userId: currentUserId,
        });

        logger.info('Document update broadcasted', {
          roomId: currentRoomId,
          userId: currentUserId,
          updateSize: data.update.length,
        });
      } catch (error) {
        logger.error('Error handling document update', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle editor awareness updates (cursors, selections)
    socket.on('editor:awareness-update', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before updating awareness'
            )
          );
          return;
        }

        const data = raw as { awareness?: Uint8Array };

        if (!data.awareness) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.VALIDATION,
              'Invalid awareness update payload'
            )
          );
          return;
        }

        // Broadcast to other users in the room (except sender)
        socket.to(currentRoomId).emit('editor:awareness-update', {
          awareness: data.awareness,
          userId: currentUserId,
        });

        logger.debug('Awareness update broadcasted', {
          roomId: currentRoomId,
          userId: currentUserId,
        });
      } catch (error) {
        logger.error('Error handling awareness update', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle editor operation tracking
    socket.on('editor:operation', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before recording operations'
            )
          );
          return;
        }

        const data = raw as {
          id?: string;
          type?: 'insert' | 'delete' | 'format' | 'move';
          description?: string;
          position?: { from: number; to: number };
          content?: string;
          formatting?: string[];
        };

        if (!data.id || !data.type || !data.description) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.VALIDATION,
              'Invalid operation payload'
            )
          );
          return;
        }

        // Broadcast operation to all users in the room (including sender for confirmation)
        io.to(currentRoomId).emit('editor:operation', {
          ...data,
          userId: currentUserId,
          timestamp: new Date().toISOString(),
        });

        logger.info('Editor operation recorded', {
          roomId: currentRoomId,
          userId: currentUserId,
          operationType: data.type,
          operationId: data.id,
        });
      } catch (error) {
        logger.error('Error handling editor operation', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle editor document initialization
    socket.on('editor:document-init', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before initializing document'
            )
          );
          return;
        }

        const data = raw as { documentId?: string };

        // Broadcast document initialization to other users in the room
        socket.to(currentRoomId).emit('editor:document-init', {
          documentId: data.documentId ?? `doc-${currentRoomId}`,
          userId: currentUserId,
          timestamp: new Date(),
        });

        logger.socket(
          'editor document initialized',
          `documentId: ${data.documentId}, userId: ${currentUserId}, roomId: ${currentRoomId}`
        );
      } catch (error) {
        logger.error('Error handling editor document init', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle user joining editor mode
    socket.on('editor:user-join', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before joining editor'
            )
          );
          return;
        }

        const data = raw as { documentId?: string };

        // Broadcast to other users in the room
        socket.to(currentRoomId).emit('editor:user-join', {
          userId: currentUserId,
          documentId: data.documentId ?? `doc-${currentRoomId}`,
          timestamp: new Date(),
        });

        logger.socket(
          'user joined editor',
          `userId: ${currentUserId}, roomId: ${currentRoomId}, documentId: ${data.documentId}`
        );
      } catch (error) {
        logger.error('Error handling editor user join', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle cursor position updates
    socket.on('editor:cursor-update', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before updating cursor'
            )
          );
          return;
        }

        const data = raw as { position?: { from: number; to: number } };

        // Broadcast cursor position to other users in the room
        socket.to(currentRoomId).emit('editor:cursor-update', {
          userId: currentUserId,
          position: data.position,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('Error handling cursor update', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle text selection updates
    socket.on('editor:selection-update', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before updating selection'
            )
          );
          return;
        }

        const data = raw as { selection?: { from: number; to: number } };

        // Broadcast selection to other users in the room
        socket.to(currentRoomId).emit('editor:selection-update', {
          userId: currentUserId,
          selection: data.selection,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('Error handling selection update', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle operation recording for history
    socket.on('editor:operation-record', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before recording operations'
            )
          );
          return;
        }

        const data = raw as {
          operation?: {
            type: string;
            position: { from: number; to: number };
            content?: unknown;
            metadata?: unknown;
          };
        };

        if (!data.operation) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.VALIDATION,
              'Invalid operation record payload'
            )
          );
          return;
        }

        // Broadcast operation to all users in the room
        io.to(currentRoomId).emit('editor:operation-record', {
          operationId: `op-${Date.now()}-${currentUserId}`,
          operation: data.operation,
          userId: currentUserId,
          timestamp: new Date(),
        });

        logger.socket(
          'editor operation recorded',
          `operationType: ${data.operation.type}, userId: ${currentUserId}, roomId: ${currentRoomId}`
        );
      } catch (error) {
        logger.error('Error handling operation record', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle undo operations
    socket.on('editor:operation-undo', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before undo operations'
            )
          );
          return;
        }

        const data = raw as { operationId?: string };

        // Broadcast undo to all users in the room
        io.to(currentRoomId).emit('editor:operation-undo', {
          operationId: data.operationId,
          userId: currentUserId,
          timestamp: new Date(),
        });

        logger.socket(
          'editor operation undo',
          `operationId: ${data.operationId}, userId: ${currentUserId}, roomId: ${currentRoomId}`
        );
      } catch (error) {
        logger.error('Error handling operation undo', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle redo operations
    socket.on('editor:operation-redo', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before redo operations'
            )
          );
          return;
        }

        const data = raw as { operationId?: string };

        // Broadcast redo to all users in the room
        io.to(currentRoomId).emit('editor:operation-redo', {
          operationId: data.operationId,
          userId: currentUserId,
          timestamp: new Date(),
        });

        logger.socket(
          'editor operation redo',
          `operationId: ${data.operationId}, userId: ${currentUserId}, roomId: ${currentRoomId}`
        );
      } catch (error) {
        logger.error('Error handling operation redo', {
          error: error instanceof Error ? error.message : String(error),
          socketId: socket.id,
          userId: currentUserId,
          roomId: currentRoomId,
        });
      }
    });

    // Handle document save operations
    socket.on('editor:document-save', (raw: unknown) => {
      try {
        if (!currentUserId || !currentRoomId) {
          emitSocketError(
            socket,
            createSocketError(
              SocketErrorCode.UNAUTHORIZED,
              'Must join room before saving document'
            )
          );
          return;
        }

        const data = raw as {
          documentId?: string;
          content?: unknown;
          title?: string;
        };

        // Broadcast save confirmation to all users in the room
        io.to(currentRoomId).emit('editor:document-save', {
          documentId: data.documentId ?? `doc-${currentRoomId}`,
          title: data.title,
          savedBy: currentUserId,
          timestamp: new Date(),
          version: Date.now(), // Simple version numbering
        });

        logger.socket(
          'editor document saved',
          `documentId: ${data.documentId}, userId: ${currentUserId}, roomId: ${currentRoomId}, title: ${data.title}`
        );
      } catch (error) {
        logger.error('Error handling document save', {
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
