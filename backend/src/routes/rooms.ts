import { Router, Request, Response } from 'express';
import { roomService } from '../services/roomService';
import { CreateRoomResponse } from '../types';
import { backendConfig } from '../config/environment';

const router = Router();

// POST /api/create-room
router.post('/create-room', (req: Request, res: Response<CreateRoomResponse>) => {
    console.log('POST /api/create-room - Request received');
    try {
        const roomId = roomService.createRoom();
        console.log('Room created with ID:', roomId);
        
        // Use configured frontend URL
        const roomLink = `${backendConfig.FRONTEND_URL}/room/${roomId}`;
        console.log('Generated room link:', roomLink);

        const response = {
            roomId,
            roomLink
        };
        
        console.log('Sending response:', response);
        res.status(201).json(response);
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
        
        if (!roomId) {
            return res.status(400).json({ error: 'Room ID is required' });
        }
        
        const exists = roomService.roomExists(roomId);

        return res.json({ exists });
    } catch (error) {
        console.error('Error checking room:', error);
        return res.status(500).json({ error: 'Failed to check room' });
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