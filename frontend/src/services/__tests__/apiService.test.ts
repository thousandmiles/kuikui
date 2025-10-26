/**
 * API Service Test Suite
 * 
 * Tests for frontend API service methods:
 * - Room creation (POST /api/create-room)
 * - Room existence check (GET /api/room/:id/exists)
 * - Stats retrieval (GET /api/stats)
 * - Error handling and network failures
 * - Integration workflows
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiService } from '../apiService';

// Mock fetch globally for testing HTTP requests
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiService', () => {
  beforeEach(() => {
    // Clear mock call history before each test
    mockFetch.mockClear();
  });

  afterEach(() => {
    // Restore all mocks after each test
    vi.clearAllMocks();
  });

  describe('createRoom', () => {
    it('should create a room successfully', async () => {
      const mockResponse = {
        roomId: '123e4567-e89b-12d3-a456-426614174000',
        roomLink: 'http://localhost:5174/room/123e4567-e89b-12d3-a456-426614174000',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.createRoom();

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/create-room',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(apiService.createRoom()).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.createRoom()).rejects.toThrow('Network error');
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(apiService.createRoom()).rejects.toThrow('Invalid JSON');
    });
  });

  describe('checkRoomExists', () => {
    it('should return true when room exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: true }),
      });

      const result = await apiService.checkRoomExists(
        '123e4567-e89b-12d3-a456-426614174000'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/room/123e4567-e89b-12d3-a456-426614174000/exists'
      );
      expect(result).toBe(true);
    });

    it('should return false when room does not exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: false }),
      });

      const result = await apiService.checkRoomExists(
        '123e4567-e89b-12d3-a456-426614174000'
      );

      expect(result).toBe(false);
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        apiService.checkRoomExists('123e4567-e89b-12d3-a456-426614174000')
      ).rejects.toThrow('HTTP error! status: 404');
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        apiService.checkRoomExists('123e4567-e89b-12d3-a456-426614174000')
      ).rejects.toThrow('Network error');
    });

    it('should handle different room IDs', async () => {
      const roomIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '987fcdeb-51a2-43f1-b098-765432100abc',
      ];

      for (const roomId of roomIds) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ exists: true }),
        });

        await apiService.checkRoomExists(roomId);

        expect(mockFetch).toHaveBeenCalledWith(
          `http://localhost:3001/api/room/${roomId}/exists`
        );
      }
    });
  });

  describe('getStats', () => {
    it('should return stats successfully', async () => {
      const mockStats = {
        totalRooms: 5,
        totalUsers: 12,
        activeRooms: 3,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

      const result = await apiService.getStats();

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3001/api/stats');
      expect(result).toEqual(mockStats);
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(apiService.getStats()).rejects.toThrow(
        'HTTP error! status: 500'
      );
    });

    it('should throw error when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiService.getStats()).rejects.toThrow('Network error');
    });

    it('should handle empty stats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await apiService.getStats();

      expect(result).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      await expect(apiService.createRoom()).rejects.toThrow('Timeout');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      });

      await expect(apiService.createRoom()).rejects.toThrow('Unexpected token');
    });

    it('should handle different HTTP error codes', async () => {
      const errorCodes = [400, 401, 403, 404, 500, 502, 503];

      for (const code of errorCodes) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: code,
        });

        await expect(apiService.createRoom()).rejects.toThrow(
          `HTTP error! status: ${code}`
        );
      }
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete room creation and verification flow', async () => {
      const roomId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock create room
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          roomId,
          roomLink: `http://localhost:5174/room/${roomId}`,
        }),
      });

      const createResult = await apiService.createRoom();
      expect(createResult.roomId).toBe(roomId);

      // Mock check room exists
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: true }),
      });

      const existsResult = await apiService.checkRoomExists(roomId);
      expect(existsResult).toBe(true);
    });

    it('should handle sequential API calls', async () => {
      // First call - create room
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          roomId: 'room-1',
          roomLink: 'http://localhost:5174/room/room-1',
        }),
      });

      await apiService.createRoom();

      // Second call - get stats
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalRooms: 1 }),
      });

      await apiService.getStats();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
