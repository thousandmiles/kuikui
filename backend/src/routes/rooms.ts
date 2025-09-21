import { Router, Request, Response } from 'express';
import { roomService } from '../services/roomService';
import { CreateRoomErrorResponse } from '../types';
import { backendConfig } from '../config/environment';
import { validateRoomId } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

// POST /api/create-room
router.post('/create-room', (req: Request, res: Response): void => {
  try {
    const roomId = roomService.createRoom();

    // Use configured frontend URL
    const roomLink = `${backendConfig.FRONTEND_URL}/room/${roomId}`;

    const response = {
      roomId,
      roomLink,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating room', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const errorResponse: CreateRoomErrorResponse = {
      roomId: '',
      roomLink: '',
      error: 'Failed to create room',
    };
    res.status(500).json(errorResponse);
  }
});

// GET /api/room/:roomId/exists
router.get('/room/:roomId/exists', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Validate room ID format
    const roomIdValidation = validateRoomId(roomId);
    if (!roomIdValidation.isValid) {
      return res.status(400).json({ error: roomIdValidation.error });
    }

    const exists = roomService.roomExists(roomId);

    return res.json({ exists });
  } catch (error) {
    const roomIdParam = req.params.roomId;
    logger.error('Error checking room', {
      roomId: roomIdParam,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Failed to check room' });
  }
});

// GET /api/stats (for monitoring)
router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = roomService.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting stats', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
