import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupSocketHandlers } from '../../services/socketService';
import { roomService } from '../../services/roomService';
import { SocketErrorCode } from '../../types';
import {
  createTestSocketServer,
  createTestSocketClient,
  waitForSocketConnect,
  waitForSocketEvent,
} from '../../../test/helpers/socketTestHelpers';

import { AddressInfo } from 'net';

/**
 * Socket.IO integration tests
 *
 * Uses a lightweight Socket.IO server + client to validate core realtime flows:
 *  - join-room success and error paths
 *  - message broadcasting to room participants
 *  - typing status propagation
 *  - nickname conflict handling
 */

describe('SocketService (integration)', () => {
  let io: any;
  let httpServer: any;
  let port: number;

  beforeAll(async () => {
    // Spin up an isolated Socket.IO server for tests
    const server = createTestSocketServer();
    io = server.io;
    httpServer = server.httpServer;
    port = server.port;

    // Attach application socket handlers
    setupSocketHandlers(io);

    await new Promise<void>(resolve => {
      httpServer.listen(port, () => resolve());
    });

    // Ensure the OS actually bound a port
    const address = httpServer.address() as AddressInfo;
    expect(address.port).toBeTruthy();
  });

  afterAll(async () => {
    await new Promise<void>(resolve => io.close(() => resolve()));
    await new Promise<void>(resolve => httpServer.close(() => resolve()));
  });

  beforeEach(() => {
    // Hard reset the in-memory state to avoid cross-test contamination
    roomService.clearAllRoomsForTest();
  });

  it('should allow a user to join a room and receive room state', async () => {
    const roomId = roomService.createRoom();

    const client = createTestSocketClient(port);
    client.connect();
    await waitForSocketConnect(client);

    client.emit('join-room', { roomId, nickname: 'Alice' });

  const response = await waitForSocketEvent<any>(client, 'room-joined');
  expect(response.success).toBe(true);
  expect(Array.isArray(response.users)).toBe(true);
  expect(response.users.length).toBeGreaterThanOrEqual(1);
  expect(response.users[0].nickname).toBe('Alice');
    expect(response.userId).toBeTruthy();
    expect(response.capacity?.current).toBe(1);
    expect(response.capacity?.max).toBeGreaterThan(0);

    client.disconnect();
  });

  it('should reject join for non-existent room with ROOM_NOT_FOUND', async () => {
    const client = createTestSocketClient(port);
    client.connect();
    await waitForSocketConnect(client);

    // random uuid that won't exist
    const missingRoomId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    client.emit('join-room', { roomId: missingRoomId, nickname: 'Bob' });

    const error = await waitForSocketEvent<any>(client, 'error');
    expect(error.code).toBe(SocketErrorCode.ROOM_NOT_FOUND);

    client.disconnect();
  });

  it('should broadcast new-message to other participants', async () => {
    const roomId = roomService.createRoom();

    const c1 = createTestSocketClient(port);
    const c2 = createTestSocketClient(port);

    c1.connect();
    c2.connect();
    await Promise.all([waitForSocketConnect(c1), waitForSocketConnect(c2)]);

    c1.emit('join-room', { roomId, nickname: 'Alice' });
    c2.emit('join-room', { roomId, nickname: 'Bob' });

    // Consume their own room-joined events
    await waitForSocketEvent<any>(c1, 'room-joined');
    await waitForSocketEvent<any>(c2, 'room-joined');

    // c2 listens for new message
    const messagePromise = waitForSocketEvent<any>(c2, 'new-message');

    // c1 sends a message
    c1.emit('send-message', { content: 'Hello Bob!' });

    const msg = await messagePromise;
    expect(msg.content).toBe('Hello Bob!');
    expect(msg.nickname).toBe('Alice');

    c1.disconnect();
    c2.disconnect();
  });

  it('should propagate typing status to other users', async () => {
    const roomId = roomService.createRoom();

    const c1 = createTestSocketClient(port);
    const c2 = createTestSocketClient(port);

    c1.connect();
    c2.connect();
    await Promise.all([waitForSocketConnect(c1), waitForSocketConnect(c2)]);

    c1.emit('join-room', { roomId, nickname: 'Alice' });
    c2.emit('join-room', { roomId, nickname: 'Bob' });

    await waitForSocketEvent<any>(c1, 'room-joined');
    await waitForSocketEvent<any>(c2, 'room-joined');

    const typingPromise = waitForSocketEvent<any>(c2, 'user-typing-status');
    c1.emit('user-typing', { isTyping: true });

    const typing = await typingPromise;
    expect(typing.isTyping).toBe(true);
    expect(typing.nickname).toBe('Alice');

    c1.disconnect();
    c2.disconnect();
  });

  it('should reject nickname conflicts (case-insensitive)', async () => {
    const roomId = roomService.createRoom();

    const c1 = createTestSocketClient(port);
    const c2 = createTestSocketClient(port);

    c1.connect();
    c2.connect();
    await Promise.all([waitForSocketConnect(c1), waitForSocketConnect(c2)]);

    c1.emit('join-room', { roomId, nickname: 'Alice' });
    await waitForSocketEvent<any>(c1, 'room-joined');

    c2.emit('join-room', { roomId, nickname: 'alice' });
    const error = await waitForSocketEvent<any>(c2, 'error');

    expect(error.code).toBe(SocketErrorCode.NICKNAME_TAKEN);

    c1.disconnect();
    c2.disconnect();
  });
});
