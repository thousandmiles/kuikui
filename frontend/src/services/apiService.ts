import { CreateRoomResponse } from '../types/index.js';

const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
    async createRoom(): Promise<CreateRoomResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/create-room`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    }

    async checkRoomExists(roomId: string): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/room/${roomId}/exists`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.exists;
        } catch (error) {
            console.error('Error checking room:', error);
            throw error;
        }
    }

    async getStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/stats`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting stats:', error);
            throw error;
        }
    }
}

export const apiService = new ApiService();