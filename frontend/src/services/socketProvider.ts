import * as Y from 'yjs';
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
} from 'y-protocols/awareness';
import { socketService } from '../services/socketService';

type EventCallback = (data: unknown) => void;

export class SocketProvider {
  private doc: Y.Doc;
  private isConnected: boolean = false;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  public awareness: Awareness;
  // Batching/throttling state
  private pendingDocUpdates: Uint8Array[] = [];
  private docFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingAwarenessClients: Set<number> = new Set();
  private awarenessFlushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(_documentId: string, doc: Y.Doc) {
    this.doc = doc;
    this.awareness = new Awareness(doc);
    this.isConnected = socketService.isConnected();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for document updates from other clients
    socketService.on('editor:document-update', (...args: unknown[]) => {
      const data = args[0] as { update: Uint8Array; userId: string };
      const update = new Uint8Array(data.update);
      Y.applyUpdate(this.doc, update);
    });

    // Listen for awareness updates from other clients
    socketService.on('editor:awareness-update', (...args: unknown[]) => {
      const data = args[0] as { awareness: Uint8Array; userId: string };
      try {
        applyAwarenessUpdate(
          this.awareness,
          new Uint8Array(data.awareness),
          'remote'
        );
      } catch (err) {
        // Silent fail; awareness updates are non-critical
        // eslint-disable-next-line no-console
        console.warn('Failed to apply awareness update', err);
      }
    });

    // Listen for document updates from this client and batch-send to server
    this.doc.on('update', (update: Uint8Array) => {
      if (!this.isConnected) {
        return;
      }
      this.pendingDocUpdates.push(update);
      if (!this.docFlushTimer) {
        // Flush after a short delay to coalesce bursts of updates
        this.docFlushTimer = setTimeout(() => this.flushDocUpdates(), 250);
      }
    });

    // Listen for awareness state changes (cursor, selection, user meta)
    this.awareness.on(
      'update',
      (changes: { added: number[]; updated: number[]; removed: number[] }) => {
        if (!this.isConnected) {
          return;
        }
        // Track changed clients and throttle send
        [...changes.added, ...changes.updated, ...changes.removed].forEach(c =>
          this.pendingAwarenessClients.add(c)
        );
        if (!this.awarenessFlushTimer) {
          this.awarenessFlushTimer = setTimeout(
            () => this.flushAwarenessUpdates(),
            400
          );
        }
      }
    );

    // Connection status handling
    socketService.on('lifecycle', (...args: unknown[]) => {
      const status = args[0] as string;
      this.isConnected = status === 'connected' || status === 'reconnected';
    });
  }

  private flushDocUpdates() {
    try {
      if (!this.isConnected || this.pendingDocUpdates.length === 0) {
        return;
      }
      const toSend = this.pendingDocUpdates.splice(
        0,
        this.pendingDocUpdates.length
      );
      // Merge updates to minimize payload count
      const merged = toSend.length === 1 ? toSend[0] : Y.mergeUpdates(toSend);
      socketService.sendDocumentUpdate(merged);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to flush doc updates', err);
    } finally {
      if (this.docFlushTimer) {
        clearTimeout(this.docFlushTimer);
        this.docFlushTimer = null;
      }
    }
  }

  private flushAwarenessUpdates() {
    try {
      if (!this.isConnected || this.pendingAwarenessClients.size === 0) {
        return;
      }
      const clients = Array.from(this.pendingAwarenessClients);
      this.pendingAwarenessClients.clear();
      const update = encodeAwarenessUpdate(this.awareness, clients);
      socketService.sendAwarenessUpdate(update);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to flush awareness updates', err);
    } finally {
      if (this.awarenessFlushTimer) {
        clearTimeout(this.awarenessFlushTimer);
        this.awarenessFlushTimer = null;
      }
    }
  }

  on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  destroy() {
    // Clean up event listeners
    this.eventListeners.clear();
    // Clear timers
    if (this.docFlushTimer) {
      clearTimeout(this.docFlushTimer);
    }
    if (this.awarenessFlushTimer) {
      clearTimeout(this.awarenessFlushTimer);
    }
    // Note: In a real implementation, you'd also clean up socket listeners
  }
}
