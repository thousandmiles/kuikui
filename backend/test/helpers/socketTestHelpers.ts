import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import express from 'express';

/**
 * Create a test Socket.IO server
 */
export function createTestSocketServer(): {
  io: SocketIOServer;
  httpServer: any;
  port: number;
} {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const port = 3000 + Math.floor(Math.random() * 1000);

  return { io, httpServer, port };
}

/**
 * Create a test Socket.IO client
 */
export function createTestSocketClient(
  port: number,
  options?: any
): ClientSocket {
  return Client(`http://localhost:${port}`, {
    transports: ['websocket'],
    autoConnect: false,
    ...options,
  });
}

/**
 * Wait for socket to connect
 */
export function waitForSocketConnect(socket: ClientSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 5000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      resolve();
    });

    socket.once('connect_error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Wait for socket event
 */
export function waitForSocketEvent<T = any>(
  socket: ClientSocket,
  eventName: string,
  timeout = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    socket.once(eventName, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Clean up socket server and clients
 */
export async function cleanupSockets(
  io?: SocketIOServer,
  httpServer?: any,
  clients?: ClientSocket[]
): Promise<void> {
  // Disconnect all clients
  if (clients) {
    clients.forEach((client) => {
      if (client.connected) {
        client.disconnect();
      }
    });
  }

  // Close server
  return new Promise((resolve) => {
    if (io) {
      io.close(() => {
        if (httpServer) {
          httpServer.close(() => resolve());
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}
