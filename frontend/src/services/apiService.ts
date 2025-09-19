import { CreateRoomResponse } from '../types/index.js';
import { frontendConfig } from '../config/environment.js';
import logger from '../utils/logger.js';

class ApiService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = frontendConfig.API_BASE_URL;
    logger.api('GET', 'initialized', undefined, undefined);
  }

  async createRoom(): Promise<CreateRoomResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/create-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as CreateRoomResponse;
    } catch (error) {
      logger.error('Error creating room', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: '/create-room',
      });
      throw error;
    }
  }

  async checkRoomExists(roomId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/room/${roomId}/exists`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as { exists: boolean };
      return data.exists;
    } catch (error) {
      logger.error('Error checking room', {
        error: error instanceof Error ? error.message : String(error),
        roomId,
        endpoint: `/room/${roomId}/exists`,
      });
      throw error;
    }
  }

  async getStats() {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return (await response.json()) as unknown;
    } catch (error) {
      logger.error('Error getting stats', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: '/stats',
      });
      throw error;
    }
  }
}

export const apiService = new ApiService();
