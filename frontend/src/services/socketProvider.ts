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

  constructor(_documentId: string, doc: Y.Doc) {
    this.doc = doc;
    this.awareness = new Awareness(doc);

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

    // Listen for document updates from this client and send to server
    this.doc.on('update', (update: Uint8Array) => {
      if (this.isConnected) {
        socketService.sendDocumentUpdate(update);
      }
    });

    // Listen for awareness state changes (cursor, selection, user meta)
    this.awareness.on(
      'update',
      (changes: { added: number[]; updated: number[]; removed: number[] }) => {
        if (!this.isConnected) {
          return;
        }
        const changedClients = [
          ...changes.added,
          ...changes.updated,
          ...changes.removed,
        ];
        if (changedClients.length === 0) {
          return;
        }
        try {
          const update = encodeAwarenessUpdate(this.awareness, changedClients);
          socketService.sendAwarenessUpdate(update);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('Failed to encode awareness update', err);
        }
      }
    );

    // Connection status handling
    socketService.on('lifecycle', (...args: unknown[]) => {
      const status = args[0] as string;
      this.isConnected = status === 'connected';
    });
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
    // Note: In a real implementation, you'd also clean up socket listeners
  }
}
