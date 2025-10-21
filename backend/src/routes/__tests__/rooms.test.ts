import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import roomsRouter from '../rooms';
import { roomService } from '../../services/roomService';

// Create Express app with middleware for testing
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api', roomsRouter);
  return app;
}

describe('Room Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/create-room', () => {
    it('should create a new room and return room details', async () => {
      const response = await request(app)
        .post('/api/create-room')
        .expect(201);

      expect(response.body).toHaveProperty('roomId');
      expect(response.body).toHaveProperty('roomLink');
      expect(response.body.roomId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(response.body.roomLink).toContain(response.body.roomId);
    });

    it('should create unique room IDs for multiple requests', async () => {
      const response1 = await request(app).post('/api/create-room').expect(201);

      const response2 = await request(app).post('/api/create-room').expect(201);

      expect(response1.body.roomId).not.toBe(response2.body.roomId);
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(roomService, 'createRoom').mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app).post('/api/create-room').expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/room/:roomId/exists', () => {
    it('should return false for non-existent room', async () => {
      const fakeRoomId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4 format

      const response = await request(app)
        .get(`/api/room/${fakeRoomId}/exists`)
        .expect(200);

      expect(response.body).toHaveProperty('exists', false);
    });

    it('should return true for existing room', async () => {
      const createRes = await request(app).post('/api/create-room').expect(201);
      const roomId = createRes.body.roomId;

      const response = await request(app)
        .get(`/api/room/${roomId}/exists`)
        .expect(200);

      expect(response.body).toHaveProperty('exists', true);
    });

    it('should return 400 for invalid room ID format', async () => {
      const response = await request(app)
        .get('/api/room/invalid-id/exists')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid room ID');
    });

    it('should return 404 for missing room ID path', async () => {
      await request(app).get('/api/room//exists').expect(404);
    });
  });

  describe('GET /api/stats', () => {
    it('should return stats for empty system', async () => {
      const response = await request(app).get('/api/stats').expect(200);

      expect(response.body).toHaveProperty('totalRooms');
      expect(response.body).toHaveProperty('totalUsers');
    });

    it('should return updated stats after creating rooms', async () => {
      await request(app).post('/api/create-room').expect(201);
      await request(app).post('/api/create-room').expect(201);

      const response = await request(app).get('/api/stats').expect(200);

      expect(response.body.totalRooms).toBeGreaterThanOrEqual(2);
    });

    it('should handle stats errors gracefully', async () => {
      vi.spyOn(roomService, 'getStats').mockImplementation(() => {
        throw new Error('Stats error');
      });

      const response = await request(app).get('/api/stats').expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Integration Tests', () => {
    it('should handle full room creation and existence check flow', async () => {
      // Create room
      const createRes = await request(app).post('/api/create-room').expect(201);
      const roomId = createRes.body.roomId;
      expect(roomId).toBeDefined();

      // Check room exists
      const existsRes = await request(app)
        .get(`/api/room/${roomId}/exists`)
        .expect(200);
      expect(existsRes.body.exists).toBe(true);

      // Check stats include the new room
      const statsRes = await request(app).get('/api/stats').expect(200);
      expect(statsRes.body.totalRooms).toBeGreaterThanOrEqual(1);
    });

    it('should handle checking non-existent room', async () => {
      const fakeRoomId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4 format

      const existsRes = await request(app)
        .get(`/api/room/${fakeRoomId}/exists`)
        .expect(200);
      expect(existsRes.body.exists).toBe(false);
    });

    it('should validate room ID format before checking', async () => {
      const response = await request(app)
        .get('/api/room/not-a-uuid/exists')
        .expect(400);

      expect(response.body.error).toContain('Invalid room ID');
    });
  });
});
