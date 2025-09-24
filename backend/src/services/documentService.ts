import { EditorDocument, DocumentOperation } from '../types/index.js';
import logger from '../utils/logger.js';

class DocumentService {
  private readonly documents: Map<string, EditorDocument> = new Map();
  private readonly documentOperations: Map<string, DocumentOperation[]> =
    new Map();

  /**
   * Initialize a new document for a room
   */
  initializeDocument(
    documentId: string,
    roomId: string,
    userId: string
  ): EditorDocument {
    const document: EditorDocument = {
      id: documentId,
      title: `Document ${documentId}`,
      content: { type: 'doc', content: [] }, // Empty ProseMirror document
      yDoc: null, // Y.js document will be handled separately
      lastModified: new Date(),
      modifiedBy: userId,
      version: 1,
      autoSaveEnabled: true,
    };

    this.documents.set(documentId, document);
    this.documentOperations.set(documentId, []);

    logger.info('Document initialized', {
      documentId,
      roomId,
      userId,
    });

    return document;
  }

  /**
   * Get document by ID
   */
  getDocument(documentId: string): EditorDocument | undefined {
    return this.documents.get(documentId);
  }

  /**
   * Update document content
   */
  updateDocument(
    documentId: string,
    content: unknown,
    userId: string,
    title?: string
  ): EditorDocument | null {
    const document = this.documents.get(documentId);
    if (!document) {
      logger.warn('Attempted to update non-existent document', { documentId });
      return null;
    }

    document.content = content;
    document.lastModified = new Date();
    document.modifiedBy = userId;
    document.version += 1;

    if (title) {
      document.title = title;
    }

    this.documents.set(documentId, document);

    logger.info('Document updated', {
      documentId,
      userId,
      version: document.version,
      title: document.title,
    });

    return document;
  }

  /**
   * Save document (manual save operation)
   */
  saveDocument(documentId: string, userId: string): EditorDocument | null {
    const document = this.documents.get(documentId);
    if (!document) {
      logger.warn('Attempted to save non-existent document', { documentId });
      return null;
    }

    document.lastModified = new Date();
    document.modifiedBy = userId;

    logger.info('Document saved', {
      documentId,
      userId,
      version: document.version,
    });

    return document;
  }

  /**
   * Get all operations for a document
   */
  getDocumentOperations(documentId: string): DocumentOperation[] {
    return this.documentOperations.get(documentId) ?? [];
  }

  /**
   * Add operation to document history
   */
  addOperation(documentId: string, operation: DocumentOperation): void {
    const operations = this.documentOperations.get(documentId) ?? [];
    operations.push(operation);
    this.documentOperations.set(documentId, operations);

    logger.info('Operation added to document', {
      documentId,
      operationId: operation.id,
      operationType: operation.type,
      userId: operation.userId,
    });
  }

  /**
   * Remove document and its operations
   */
  removeDocument(documentId: string): boolean {
    const existed = this.documents.has(documentId);
    this.documents.delete(documentId);
    this.documentOperations.delete(documentId);

    if (existed) {
      logger.info('Document removed', { documentId });
    }

    return existed;
  }

  /**
   * Get all documents (for debugging/admin purposes)
   */
  getAllDocuments(): EditorDocument[] {
    return Array.from(this.documents.values());
  }

  /**
   * Clean up old documents (could be called periodically)
   */
  cleanupOldDocuments(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = new Date();
    let cleaned = 0;

    for (const [documentId, document] of this.documents.entries()) {
      const ageMs = now.getTime() - document.lastModified.getTime();
      if (ageMs > maxAgeMs) {
        this.removeDocument(documentId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up old documents', { count: cleaned, maxAgeMs });
    }

    return cleaned;
  }
}

// Export singleton instance
export const documentService = new DocumentService();
export default documentService;
