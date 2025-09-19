import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { roomService } from '../services/roomService';
import { User, ChatMessage, JoinRoomRequest, JoinRoomResponse } from '../types';

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    let currentUserId: string | null = null;
    let currentRoomId: string | null = null;

    // Handle joining a room
    socket.on('join-room', (data: JoinRoomRequest) => {
      try {
        const { roomId, nickname } = data;

        // Validate input
        if (!roomId || !nickname.trim()) {
          socket.emit('error', {
            message: 'Room ID and nickname are required',
          });
          return;
        }

        // Check if room exists
        if (!roomService.roomExists(roomId)) {
          socket.emit('error', { message: 'Room does not exist' });
          return;
        }

        // Create user object
        const userId = uuidv4();
        const user: User = {
          id: userId,
          nickname: nickname.trim(),
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

        // Send response to the joining user
        const response: JoinRoomResponse = {
          success: true,
          users,
          messages,
        };
        socket.emit('room-joined', response);

        // Notify other users in the room
        socket.to(roomId).emit('user-joined', user);

        console.log(`User ${nickname} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle sending messages
    socket.on('send-message', (data: { content: string }) => {
      try {
        if (!currentUserId || !currentRoomId) {
          socket.emit('error', { message: 'Not in a room' });
          return;
        }

        const { content } = data;
        if (!content.trim()) {
          socket.emit('error', { message: 'Message content cannot be empty' });
          return;
        }

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
          content: content.trim(),
          timestamp: new Date(),
        };

        // Add message to room
        roomService.addMessage(currentRoomId, message);

        // Broadcast message to all users in the room
        io.to(currentRoomId).emit('new-message', message);

        console.log(
          `Message sent in room ${currentRoomId} by ${user.nickname}`
        );
      } catch (error) {
        console.error('Error sending message:', error);
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
        console.error('Error handling typing status:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      try {
        console.log(`User disconnected: ${socket.id}`);

        if (currentUserId && currentRoomId) {
          // Remove user from room
          const user = roomService.removeUserFromRoom(
            currentRoomId,
            currentUserId
          );

          if (user) {
            // Notify other users in the room
            socket.to(currentRoomId).emit('user-left', currentUserId);
            console.log(`User ${user.nickname} left room ${currentRoomId}`);
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  // Periodic cleanup of expired rooms
  const cleanupInterval = setInterval(
    () => {
      const deletedCount = roomService.cleanupExpiredRooms(24);
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} expired rooms`);
      }
    },
    60 * 60 * 1000
  ); // Run every hour

  // Clear interval on server shutdown
  process.on('SIGTERM', () => {
    clearInterval(cleanupInterval);
  });
}
