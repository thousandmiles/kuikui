import { v4 as uuidv4 } from 'uuid';
import { Room, User, ChatMessage } from '../types';

class RoomService {
    private rooms = new Map<string, Room>();

    createRoom(): string {
        const roomId = uuidv4();
        const room: Room = {
            id: roomId,
            createdAt: new Date(),
            lastActivity: new Date(),
            users: new Map(),
            messages: []
        };

        this.rooms.set(roomId, room);
        console.log(`Room created: ${roomId}`);
        return roomId;
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    roomExists(roomId: string): boolean {
        return this.rooms.has(roomId);
    }

    addUserToRoom(roomId: string, user: User): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.users.set(user.id, user);
        room.lastActivity = new Date();
        console.log(`User ${user.nickname} joined room ${roomId}`);
        return true;
    }

    removeUserFromRoom(roomId: string, userId: string): User | undefined {
        const room = this.rooms.get(roomId);
        if (!room) return undefined;

        const user = room.users.get(userId);
        if (user) {
            room.users.delete(userId);
            room.lastActivity = new Date();
            console.log(`User ${user.nickname} left room ${roomId}`);
        }
        return user;
    }

    getUsersInRoom(roomId: string): User[] {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.users.values()) : [];
    }

    addMessage(roomId: string, message: ChatMessage): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.messages.push(message);
        room.lastActivity = new Date();

        // Keep only last 100 messages to prevent memory issues
        if (room.messages.length > 100) {
            room.messages = room.messages.slice(-100);
        }

        return true;
    }

    getMessages(roomId: string): ChatMessage[] {
        const room = this.rooms.get(roomId);
        return room ? room.messages : [];
    }

    updateUserStatus(roomId: string, userId: string, isOnline: boolean): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        const user = room.users.get(userId);
        if (!user) return false;

        user.isOnline = isOnline;
        room.lastActivity = new Date();
        return true;
    }

    // Clean up expired rooms (to be called periodically)
    cleanupExpiredRooms(expiryHours: number = 24): number {
        const now = new Date();
        const expiryTime = expiryHours * 60 * 60 * 1000; // Convert to milliseconds
        let deletedCount = 0;

        for (const [roomId, room] of this.rooms.entries()) {
            const timeSinceLastActivity = now.getTime() - room.lastActivity.getTime();

            if (timeSinceLastActivity > expiryTime || room.users.size === 0) {
                this.rooms.delete(roomId);
                deletedCount++;
                console.log(`Deleted expired room: ${roomId}`);
            }
        }

        return deletedCount;
    }

    // Get room statistics
    getStats() {
        const totalRooms = this.rooms.size;
        const totalUsers = Array.from(this.rooms.values())
            .reduce((sum, room) => sum + room.users.size, 0);

        return { totalRooms, totalUsers };
    }
}

export const roomService = new RoomService();