import { Router, Request, Response } from 'express';
import { roomService } from '../services/roomService';
import { CreateRoomResponse } from '../types';

const router = Router();

// POST /api/create-room
router.post('/create-room', (req: Request, res: Response<CreateRoomResponse>) => {
    try {
        const roomId = roomService.createRoom();
        const roomLink = `${req.protocol}://${req.get('host')}/room/${roomId}`;

        res.status(201).json({
            roomId,
            roomLink
        });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({
            roomId: '',
            roomLink: '',
            error: 'Failed to create room'
        } as any);
    }
});

// GET /api/room/:roomId/exists
router.get('/room/:roomId/exists', (req: Request, res: Response) => {
    try {
        const { roomId } = req.params;
        const exists = roomService.roomExists(roomId);

        res.json({ exists });
    } catch (error) {
        console.error('Error checking room:', error);
        res.status(500).json({ error: 'Failed to check room' });
    }
});

// GET /api/stats (for monitoring)
router.get('/stats', (req: Request, res: Response) => {
    try {
        const stats = roomService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

export default router;