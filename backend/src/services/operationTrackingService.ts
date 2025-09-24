import { DocumentOperation } from '../types/index.js';
import logger from '../utils/logger.js';

class OperationTrackingService {
  private readonly operationHistory: Map<string, DocumentOperation[]> =
    new Map();
  private readonly operationIndex: Map<string, DocumentOperation> = new Map();

  /**
   * Record a new operation
   */
  recordOperation(documentId: string, operation: DocumentOperation): void {
    // Add to document history
    const history = this.operationHistory.get(documentId) ?? [];
    history.push(operation);
    this.operationHistory.set(documentId, history);

    // Add to operation index for quick lookup
    this.operationIndex.set(operation.id, operation);

    logger.info('Operation recorded', {
      documentId,
      operationId: operation.id,
      type: operation.type,
      userId: operation.userId,
      position: operation.position,
    });
  }

  /**
   * Get operation history for a document
   */
  getOperationHistory(
    documentId: string,
    limit?: number,
    offset?: number
  ): DocumentOperation[] {
    const history = this.operationHistory.get(documentId) ?? [];

    if (limit ?? offset) {
      const start = offset ?? 0;
      const end = limit ? start + limit : undefined;
      return history.slice(start, end);
    }

    return history;
  }

  /**
   * Get operation by ID
   */
  getOperation(operationId: string): DocumentOperation | undefined {
    return this.operationIndex.get(operationId);
  }

  /**
   * Get operations by user
   */
  getOperationsByUser(documentId: string, userId: string): DocumentOperation[] {
    const history = this.operationHistory.get(documentId) ?? [];
    return history.filter(op => op.userId === userId);
  }

  /**
   * Get operations by type
   */
  getOperationsByType(
    documentId: string,
    type: DocumentOperation['type']
  ): DocumentOperation[] {
    const history = this.operationHistory.get(documentId) ?? [];
    return history.filter(op => op.type === type);
  }

  /**
   * Get operations in time range
   */
  getOperationsInTimeRange(
    documentId: string,
    startTime: Date,
    endTime: Date
  ): DocumentOperation[] {
    const history = this.operationHistory.get(documentId) ?? [];
    return history.filter(
      op => op.timestamp >= startTime && op.timestamp <= endTime
    );
  }

  /**
   * Get recent operations (last N operations)
   */
  getRecentOperations(
    documentId: string,
    count: number = 10
  ): DocumentOperation[] {
    const history = this.operationHistory.get(documentId) ?? [];
    return history.slice(-count);
  }

  /**
   * Search operations by content
   */
  searchOperations(
    documentId: string,
    searchTerm: string
  ): DocumentOperation[] {
    const history = this.operationHistory.get(documentId) ?? [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    return history.filter(op => {
      // Search in content preview if available
      if (op.metadata?.contentPreview) {
        return op.metadata.contentPreview
          .toLowerCase()
          .includes(lowerSearchTerm);
      }

      // Search in operation type
      if (op.type.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }

      // Search in user nickname
      if (op.userNickname.toLowerCase().includes(lowerSearchTerm)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Get operation statistics for a document
   */
  getOperationStats(documentId: string): {
    totalOperations: number;
    operationsByType: Record<string, number>;
    operationsByUser: Record<string, number>;
    timeRange: { earliest: Date | null; latest: Date | null };
  } {
    const history = this.operationHistory.get(documentId) ?? [];

    const stats = {
      totalOperations: history.length,
      operationsByType: {} as Record<string, number>,
      operationsByUser: {} as Record<string, number>,
      timeRange: {
        earliest: null as Date | null,
        latest: null as Date | null,
      },
    };

    if (history.length === 0) {
      return stats;
    }

    // Calculate statistics
    for (const op of history) {
      // Count by type
      stats.operationsByType[op.type] =
        (stats.operationsByType[op.type] ?? 0) + 1;

      // Count by user
      const userKey = `${op.userNickname} (${op.userId})`;
      stats.operationsByUser[userKey] =
        (stats.operationsByUser[userKey] ?? 0) + 1;

      // Track time range
      if (
        !stats.timeRange.earliest ||
        op.timestamp < stats.timeRange.earliest
      ) {
        stats.timeRange.earliest = op.timestamp;
      }
      if (!stats.timeRange.latest || op.timestamp > stats.timeRange.latest) {
        stats.timeRange.latest = op.timestamp;
      }
    }

    return stats;
  }

  /**
   * Clear operation history for a document
   */
  clearOperationHistory(documentId: string): boolean {
    const history = this.operationHistory.get(documentId);
    if (!history) {
      return false;
    }

    // Remove from operation index
    for (const op of history) {
      this.operationIndex.delete(op.id);
    }

    // Clear document history
    this.operationHistory.delete(documentId);

    logger.info('Operation history cleared', {
      documentId,
      operationsRemoved: history.length,
    });

    return true;
  }

  /**
   * Remove old operations beyond a certain limit
   */
  trimOperationHistory(
    documentId: string,
    maxOperations: number = 1000
  ): number {
    const history = this.operationHistory.get(documentId);
    if (!history || history.length <= maxOperations) {
      return 0;
    }

    const operationsToRemove = history.length - maxOperations;
    const removedOps = history.splice(0, operationsToRemove);

    // Remove from operation index
    for (const op of removedOps) {
      this.operationIndex.delete(op.id);
    }

    logger.info('Operation history trimmed', {
      documentId,
      operationsRemoved: operationsToRemove,
      remainingOperations: history.length,
    });

    return operationsToRemove;
  }

  /**
   * Get all documents with operations (for debugging/admin)
   */
  getAllDocumentsWithOperations(): string[] {
    return Array.from(this.operationHistory.keys());
  }

  /**
   * Clean up operations for removed documents
   */
  cleanupOperations(existingDocumentIds: string[]): number {
    let cleaned = 0;
    const existingSet = new Set(existingDocumentIds);

    for (const documentId of this.operationHistory.keys()) {
      if (!existingSet.has(documentId)) {
        this.clearOperationHistory(documentId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info('Cleaned up operations for removed documents', {
        count: cleaned,
      });
    }

    return cleaned;
  }
}

// Export singleton instance
export const operationTrackingService = new OperationTrackingService();
export default operationTrackingService;
