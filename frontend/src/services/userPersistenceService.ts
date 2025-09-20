import logger from '../utils/logger.js';

export interface StoredUserSession {
  userId: string;
  nickname: string;
  roomId: string;
  lastActivity: number; // timestamp
}

/**
 * Service for managing user persistence across browser sessions
 */
class UserPersistenceService {
  private readonly USER_SESSION_KEY = 'kuikui_user_session';
  private readonly SESSION_EXPIRY_HOURS = 24; // Sessions expire after 24 hours

  // Legacy key for migration purposes
  private readonly LEGACY_USER_ID_KEY = 'kuikui_user_id';

  constructor() {
    // Clean up any legacy data on initialization
    this.cleanupLegacyData();
  }

  /**
   * Clean up legacy user ID storage
   */
  private cleanupLegacyData(): void {
    try {
      if (localStorage.getItem(this.LEGACY_USER_ID_KEY)) {
        localStorage.removeItem(this.LEGACY_USER_ID_KEY);
        logger.info('Cleaned up legacy user ID from localStorage');
      }
    } catch (error) {
      logger.error('Failed to clean up legacy data', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Store complete user session information
   */
  setUserSession(userId: string, nickname: string, roomId: string): void {
    try {
      const session: StoredUserSession = {
        userId,
        nickname,
        roomId,
        lastActivity: Date.now(),
      };
      localStorage.setItem(this.USER_SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      logger.error('Failed to store user session in localStorage', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        nickname,
        roomId,
      });
    }
  }

  /**
   * Get stored user session if it's valid and not expired
   */
  getUserSession(currentRoomId?: string): StoredUserSession | null {
    try {
      const sessionData = localStorage.getItem(this.USER_SESSION_KEY);
      if (!sessionData) {
        return null;
      }

      const parsed = JSON.parse(sessionData) as unknown;

      // Validate the parsed data has the expected structure
      if (!this.isValidStoredUserSession(parsed)) {
        this.clearUserSession();
        return null;
      }

      const session = parsed;

      // Check if session is expired
      const now = Date.now();
      const sessionAge = now - session.lastActivity;
      const maxAge = this.SESSION_EXPIRY_HOURS * 60 * 60 * 1000;

      if (sessionAge > maxAge) {
        this.clearUserSession();
        return null;
      }

      // If currentRoomId is provided, only return session if it matches
      if (currentRoomId && session.roomId !== currentRoomId) {
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Failed to retrieve user session from localStorage', {
        error: error instanceof Error ? error.message : String(error),
        currentRoomId,
      });
      return null;
    }
  }

  /**
   * Type guard to validate stored user session structure
   */
  private isValidStoredUserSession(obj: unknown): obj is StoredUserSession {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      typeof (obj as StoredUserSession).userId === 'string' &&
      typeof (obj as StoredUserSession).nickname === 'string' &&
      typeof (obj as StoredUserSession).roomId === 'string' &&
      typeof (obj as StoredUserSession).lastActivity === 'number'
    );
  }

  /**
   * Update the last activity timestamp for the current session
   */
  updateLastActivity(): void {
    try {
      const sessionData = localStorage.getItem(this.USER_SESSION_KEY);
      if (sessionData) {
        const parsed = JSON.parse(sessionData) as unknown;
        if (this.isValidStoredUserSession(parsed)) {
          const session = parsed;
          session.lastActivity = Date.now();
          localStorage.setItem(this.USER_SESSION_KEY, JSON.stringify(session));
        }
      }
    } catch (error) {
      logger.error('Failed to update last activity in localStorage', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clear the stored user session
   */
  clearUserSession(): void {
    try {
      localStorage.removeItem(this.USER_SESSION_KEY);
    } catch (error) {
      logger.error('Failed to clear user session from localStorage', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check if user has a stored session
   */
  hasStoredSession(): boolean {
    return this.getUserSession() !== null;
  }

  /**
   * Get the user ID from the current session (if any)
   */
  getUserIdFromSession(): string | null {
    const session = this.getUserSession();
    return session ? session.userId : null;
  }
}

export const userPersistenceService = new UserPersistenceService();
