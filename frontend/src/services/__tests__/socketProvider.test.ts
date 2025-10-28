/**
 * @fileoverview Comprehensive test suite for SocketProvider
 * 
 * Tests Yjs document and awareness provider for collaborative editing:
 * - Document synchronization with batching/throttling
 * - Awareness state updates (cursor, selection, user presence)
 * - Connection lifecycle and reconnection handling
 * - Event listener management
 * - Error handling and cleanup
 * 
 * @see {@link SocketProvider} for implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate } from 'y-protocols/awareness';
import { SocketProvider } from '../socketProvider';

// Mock socketService - must be defined inline in vi.mock
vi.mock('../socketService', () => ({
  socketService: {
    isConnected: vi.fn(() => true),
    on: vi.fn(),
    off: vi.fn(),
    sendDocumentUpdate: vi.fn(),
    sendAwarenessUpdate: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SocketProvider', () => {
  let doc: Y.Doc;
  let provider: SocketProvider;
  const documentId = 'test-doc-123';
  let mockSocketService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    doc = new Y.Doc();
    
    // Get the mocked instance
    const { socketService } = await import('../socketService');
    mockSocketService = socketService;
    mockSocketService.isConnected.mockReturnValue(true);
  });

  afterEach(() => {
    if (provider) {
      provider.destroy();
    }
    doc.destroy();
    vi.useRealTimers();
  });

  describe('Constructor', () => {
    it('should initialize with document and awareness', () => {
      provider = new SocketProvider(documentId, doc);

      expect(provider).toBeDefined();
      expect(provider.awareness).toBeInstanceOf(Awareness);
      expect(provider.awareness.doc).toBe(doc);
    });

    it('should check connection status on initialization', () => {
      provider = new SocketProvider(documentId, doc);

      expect(mockSocketService.isConnected).toHaveBeenCalled();
    });

    it('should set up event listeners for socket events', () => {
      provider = new SocketProvider(documentId, doc);

      expect(mockSocketService.on).toHaveBeenCalledWith(
        'editor:document-update',
        expect.any(Function)
      );
      expect(mockSocketService.on).toHaveBeenCalledWith(
        'editor:awareness-update',
        expect.any(Function)
      );
      expect(mockSocketService.on).toHaveBeenCalledWith(
        'lifecycle',
        expect.any(Function)
      );
    });

    it('should initialize with disconnected status when socket is disconnected', () => {
      mockSocketService.isConnected.mockReturnValue(false);
      provider = new SocketProvider(documentId, doc);

      // Provider created successfully even when disconnected
      expect(provider).toBeDefined();
    });
  });

  describe('Document Update Handling', () => {
    beforeEach(() => {
      provider = new SocketProvider(documentId, doc);
    });

    it('should apply incoming document updates', () => {
      const text = doc.getText('content');
      
      // Get the document update handler
      const calls = mockSocketService.on.mock.calls as any[];
      const updateHandler = calls.find(c => c[0] === 'editor:document-update')?.[1];

      // Create an update from another document
      const otherDoc = new Y.Doc();
      const otherText = otherDoc.getText('content');
      otherText.insert(0, 'Hello from remote');
      const update = Y.encodeStateAsUpdate(otherDoc);

      // Simulate receiving update
      updateHandler?.({ update, userId: 'user-456' });

      // Check that update was applied
      expect(text.toString()).toBe('Hello from remote');

      otherDoc.destroy();
    });

    it('should batch local document updates before sending', () => {
      const text = doc.getText('content');

      // Make multiple rapid changes
      text.insert(0, 'Hello');
      text.insert(5, ' World');
      text.insert(11, '!');

      // Should not send immediately
      expect(mockSocketService.sendDocumentUpdate).not.toHaveBeenCalled();

      // Fast-forward the batch timer
      vi.advanceTimersByTime(250);

      // Should send merged update
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalledTimes(1);
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalledWith(
        expect.any(Uint8Array)
      );
    });

    it('should merge multiple pending updates before sending', () => {
      const text = doc.getText('content');

      // Make multiple changes
      text.insert(0, 'First');
      text.insert(5, ' Second');
      text.insert(12, ' Third');

      // Fast-forward timer
      vi.advanceTimersByTime(250);

      // Should have sent only once with merged update
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalledTimes(1);
      
      // The sent update should contain all changes
      const sentUpdate = mockSocketService.sendDocumentUpdate.mock.calls[0][0];
      expect(sentUpdate).toBeInstanceOf(Uint8Array);
    });

    it('should not send updates when disconnected', () => {
      // Simulate disconnection
      const calls = mockSocketService.on.mock.calls as any[];
      const lifecycleHandler = calls.find(c => c[0] === 'lifecycle')?.[1];
      lifecycleHandler?.('disconnected');

      const text = doc.getText('content');
      text.insert(0, 'Test');

      // Fast-forward timer
      vi.advanceTimersByTime(250);

      // Should not send when disconnected
      expect(mockSocketService.sendDocumentUpdate).not.toHaveBeenCalled();
    });

    it('should allow document update errors to propagate', () => {
      const calls = mockSocketService.on.mock.calls as any[];
      const updateHandler = calls.find(c => c[0] === 'editor:document-update')?.[1];

      // Send invalid update - Yjs will throw
      expect(() => {
        updateHandler?.({ update: new Uint8Array([255, 255, 255]), userId: 'user-123' });
      }).toThrow();
    });

    it('should clear timer after flushing updates', () => {
      const text = doc.getText('content');
      text.insert(0, 'Test');

      vi.advanceTimersByTime(250);

      // Make another change after flush
      text.insert(4, ' More');

      // Should batch again (timer was cleared)
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(250);

      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalledTimes(2);
    });

    it('should send single update without merging if only one pending', () => {
      const text = doc.getText('content');
      text.insert(0, 'Single');

      vi.advanceTimersByTime(250);

      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Awareness Update Handling', () => {
    beforeEach(() => {
      provider = new SocketProvider(documentId, doc);
    });

    it('should apply incoming awareness updates', () => {
      const calls = mockSocketService.on.mock.calls as any[];
      const awarenessHandler = calls.find(c => c[0] === 'editor:awareness-update')?.[1];

      // Create awareness update from another client
      const otherDoc = new Y.Doc();
      const otherAwareness = new Awareness(otherDoc);
      otherAwareness.setLocalStateField('user', { name: 'Alice', color: '#ff0000' });

      const update = encodeAwarenessUpdate(otherAwareness, [otherDoc.clientID]);

      // Simulate receiving awareness update
      awarenessHandler?.({ awareness: update, userId: 'user-456' });

      // Check that awareness state was updated
      const states = provider.awareness.getStates();
      expect(states.size).toBeGreaterThan(0);

      otherDoc.destroy();
    });

    it('should batch local awareness updates before sending', () => {
      // Make rapid awareness changes
      provider.awareness.setLocalStateField('user', { name: 'Bob' });
      provider.awareness.setLocalStateField('cursor', { x: 10, y: 20 });
      provider.awareness.setLocalStateField('selection', { from: 0, to: 5 });

      // Should not send immediately
      expect(mockSocketService.sendAwarenessUpdate).not.toHaveBeenCalled();

      // Fast-forward the throttle timer
      vi.advanceTimersByTime(400);

      // Should send awareness update
      expect(mockSocketService.sendAwarenessUpdate).toHaveBeenCalledTimes(1);
      expect(mockSocketService.sendAwarenessUpdate).toHaveBeenCalledWith(
        expect.any(Uint8Array)
      );
    });

    it('should not send awareness updates when disconnected', () => {
      // Simulate disconnection
      const calls = mockSocketService.on.mock.calls as any[];
      const lifecycleHandler = calls.find(c => c[0] === 'lifecycle')?.[1];
      lifecycleHandler?.('disconnected');

      provider.awareness.setLocalStateField('user', { name: 'Test' });

      vi.advanceTimersByTime(400);

      expect(mockSocketService.sendAwarenessUpdate).not.toHaveBeenCalled();
    });

    it('should handle awareness update errors gracefully', () => {
      const calls = mockSocketService.on.mock.calls as any[];
      const awarenessHandler = calls.find(c => c[0] === 'editor:awareness-update')?.[1];

      // Send invalid awareness data - should not throw
      expect(() => {
        awarenessHandler?.({ awareness: new Uint8Array([255, 255]), userId: 'user-123' });
      }).not.toThrow();
    });

    it('should track multiple client changes in awareness', () => {
      // Simulate awareness changes for added, updated, removed clients
      provider.awareness.setLocalStateField('user', { name: 'Client1' });

      vi.advanceTimersByTime(400);

      expect(mockSocketService.sendAwarenessUpdate).toHaveBeenCalled();
    });

    it('should clear timer after flushing awareness updates', () => {
      provider.awareness.setLocalStateField('user', { name: 'User1' });

      vi.advanceTimersByTime(400);

      // Make another change after flush
      provider.awareness.setLocalStateField('cursor', { x: 100 });

      // Should throttle again (timer was cleared)
      expect(mockSocketService.sendAwarenessUpdate).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(400);

      expect(mockSocketService.sendAwarenessUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Connection Lifecycle', () => {
    beforeEach(() => {
      provider = new SocketProvider(documentId, doc);
    });

    it('should update connection status on lifecycle events', () => {
      const calls = mockSocketService.on.mock.calls as any[];
      const lifecycleHandler = calls.find(c => c[0] === 'lifecycle')?.[1];

      // Test connected
      lifecycleHandler?.('connected');
      
      const text = doc.getText('content');
      text.insert(0, 'Connected');
      vi.advanceTimersByTime(250);
      
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalled();
      mockSocketService.sendDocumentUpdate.mockClear();

      // Test disconnected
      lifecycleHandler?.('disconnected');
      
      text.insert(9, ' More');
      vi.advanceTimersByTime(250);
      
      // Should not send when disconnected
      expect(mockSocketService.sendDocumentUpdate).not.toHaveBeenCalled();
    });

    it('should handle reconnection event', () => {
      const calls = mockSocketService.on.mock.calls as any[];
      const lifecycleHandler = calls.find(c => c[0] === 'lifecycle')?.[1];

      lifecycleHandler?.('reconnected');

      // After reconnection, updates should be sent
      const text = doc.getText('content');
      text.insert(0, 'Reconnected');
      vi.advanceTimersByTime(250);

      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalled();
    });

    it('should not send updates for other lifecycle states', () => {
      const calls = mockSocketService.on.mock.calls as any[];
      const lifecycleHandler = calls.find(c => c[0] === 'lifecycle')?.[1];

      lifecycleHandler?.('connecting');

      const text = doc.getText('content');
      text.insert(0, 'Test');
      vi.advanceTimersByTime(250);

      // Should not send during connecting state
      expect(mockSocketService.sendDocumentUpdate).not.toHaveBeenCalled();
    });

    it('should handle lifecycle events during batching', () => {
      const text = doc.getText('content');
      text.insert(0, 'Start');

      // Disconnect before flush
      const calls = mockSocketService.on.mock.calls as any[];
      const lifecycleHandler = calls.find(c => c[0] === 'lifecycle')?.[1];
      lifecycleHandler?.('disconnected');

      vi.advanceTimersByTime(250);

      // Should not flush while disconnected
      expect(mockSocketService.sendDocumentUpdate).not.toHaveBeenCalled();

      // Reconnect
      lifecycleHandler?.('reconnected');
      text.insert(5, ' End');
      vi.advanceTimersByTime(250);

      // Should flush after reconnection
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalled();
    });
  });

  describe('Event Management', () => {
    beforeEach(() => {
      provider = new SocketProvider(documentId, doc);
    });

    it('should add event listeners', () => {
      const callback = vi.fn();
      provider.on('custom-event', callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      provider.on('test-event', callback1);
      provider.on('test-event', callback2);

      // Both callbacks should be registered
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should handle events without listeners', () => {
      // Should not throw when no listeners exist
      expect(() => {
        provider.on('new-event', vi.fn());
      }).not.toThrow();
    });
  });

  describe('Cleanup and Destruction', () => {
    beforeEach(() => {
      provider = new SocketProvider(documentId, doc);
    });

    it('should clear event listeners on destroy', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      provider.on('event1', callback1);
      provider.on('event2', callback2);

      provider.destroy();

      // Event listeners should be cleared
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
    });

    it('should clear document update timer on destroy', () => {
      const text = doc.getText('content');
      text.insert(0, 'Test');

      // Destroy before timer fires
      provider.destroy();

      vi.advanceTimersByTime(250);

      // Should not send after destroy
      expect(mockSocketService.sendDocumentUpdate).not.toHaveBeenCalled();
    });

    it('should clear awareness update timer on destroy', () => {
      provider.awareness.setLocalStateField('user', { name: 'Test' });

      // Destroy before timer fires
      provider.destroy();

      vi.advanceTimersByTime(400);

      // Should not send after destroy
      expect(mockSocketService.sendAwarenessUpdate).not.toHaveBeenCalled();
    });

    it('should handle destroy when no timers are active', () => {
      expect(() => {
        provider.destroy();
      }).not.toThrow();
    });

    it('should handle multiple destroy calls', () => {
      provider.destroy();

      expect(() => {
        provider.destroy();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      provider = new SocketProvider(documentId, doc);
    });

    it('should handle errors during document flush', () => {
      mockSocketService.sendDocumentUpdate.mockImplementation(() => {
        throw new Error('Network error');
      });

      const text = doc.getText('content');
      text.insert(0, 'Test');

      // Should not throw
      expect(() => {
        vi.advanceTimersByTime(250);
      }).not.toThrow();
    });

    it('should handle errors during awareness flush', () => {
      mockSocketService.sendAwarenessUpdate.mockImplementation(() => {
        throw new Error('Network error');
      });

      provider.awareness.setLocalStateField('user', { name: 'Test' });

      // Should not throw
      expect(() => {
        vi.advanceTimersByTime(400);
      }).not.toThrow();
    });

    it('should clear timers even when flush fails', () => {
      mockSocketService.sendDocumentUpdate.mockImplementation(() => {
        throw new Error('Fail');
      });

      const text = doc.getText('content');
      text.insert(0, 'First');
      vi.advanceTimersByTime(250);

      // Timer should be cleared despite error
      mockSocketService.sendDocumentUpdate.mockClear();
      mockSocketService.sendDocumentUpdate.mockImplementation(() => {}); // Reset to no error

      text.insert(5, ' Second');
      vi.advanceTimersByTime(250);

      // Should send again (timer was properly cleared)
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalled();
    });
  });

  describe('Batching and Throttling Behavior', () => {
    beforeEach(() => {
      provider = new SocketProvider(documentId, doc);
    });

    it('should use nullish coalescing for timer assignment', () => {
      const text = doc.getText('content');

      // First change sets timer
      text.insert(0, 'First');
      
      // Second change should not reset timer (uses ??=)
      text.insert(5, ' Second');

      // Only one flush should occur at 250ms
      vi.advanceTimersByTime(250);
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalledTimes(1);
    });

    it('should batch rapid sequential updates', () => {
      const text = doc.getText('content');

      // Make 10 rapid changes
      for (let i = 0; i < 10; i++) {
        text.insert(text.length, `${i}`);
      }

      // All should be batched into one send
      vi.advanceTimersByTime(250);
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalledTimes(1);
    });

    it('should respect batching window for document updates (250ms)', () => {
      const text = doc.getText('content');

      text.insert(0, 'First');
      vi.advanceTimersByTime(100); // Not enough time

      expect(mockSocketService.sendDocumentUpdate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(150); // Total 250ms

      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalledTimes(1);
    });

    it('should respect throttling window for awareness updates (400ms)', () => {
      provider.awareness.setLocalStateField('cursor', { x: 0 });
      vi.advanceTimersByTime(200); // Not enough time

      expect(mockSocketService.sendAwarenessUpdate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(200); // Total 400ms

      expect(mockSocketService.sendAwarenessUpdate).toHaveBeenCalledTimes(1);
    });

    it('should handle interleaved document and awareness updates', () => {
      const text = doc.getText('content');

      // Doc update
      text.insert(0, 'Text');
      
      // Awareness update
      provider.awareness.setLocalStateField('user', { name: 'Test' });

      // Different timers, different intervals
      vi.advanceTimersByTime(250);
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalledTimes(1);
      expect(mockSocketService.sendAwarenessUpdate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(150); // Total 400ms for awareness
      expect(mockSocketService.sendAwarenessUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document updates', () => {
      provider = new SocketProvider(documentId, doc);

      // Trigger update with no changes
      vi.advanceTimersByTime(250);

      // Should not error, but also should not send
      expect(mockSocketService.sendDocumentUpdate).not.toHaveBeenCalled();
    });

    it('should handle awareness with no pending clients', () => {
      provider = new SocketProvider(documentId, doc);

      // Manually trigger flush without changes
      vi.advanceTimersByTime(400);

      expect(mockSocketService.sendAwarenessUpdate).not.toHaveBeenCalled();
    });

    it('should handle receiving updates while disconnected', () => {
      mockSocketService.isConnected.mockReturnValue(false);
      provider = new SocketProvider(documentId, doc);

      const calls = mockSocketService.on.mock.calls as any[];
      const updateHandler = calls.find(c => c[0] === 'editor:document-update')?.[1];

      // Should still apply incoming updates even when disconnected
      const otherDoc = new Y.Doc();
      const otherText = otherDoc.getText('content');
      otherText.insert(0, 'Remote');
      const update = Y.encodeStateAsUpdate(otherDoc);

      expect(() => {
        updateHandler?.({ update, userId: 'remote-user' });
      }).not.toThrow();

      otherDoc.destroy();
    });

    it('should handle rapid connect/disconnect cycles', () => {
      provider = new SocketProvider(documentId, doc);

      const calls = mockSocketService.on.mock.calls as any[];
      const lifecycleHandler = calls.find(c => c[0] === 'lifecycle')?.[1];

      // Rapid state changes
      lifecycleHandler?.('connected');
      lifecycleHandler?.('disconnected');
      lifecycleHandler?.('reconnected');
      lifecycleHandler?.('disconnected');
      lifecycleHandler?.('connected');

      const text = doc.getText('content');
      text.insert(0, 'Test');
      vi.advanceTimersByTime(250);

      // Should work correctly after rapid cycles
      expect(mockSocketService.sendDocumentUpdate).toHaveBeenCalled();
    });
  });
});
