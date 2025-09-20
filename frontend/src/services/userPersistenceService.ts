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
  private readonly SESSION_KEY_PREFIX = 'kuikui_session_';
  private readonly SESSION_EXPIRY_HOURS = 24; // Sessions expire after 24 hours

  // Legacy key for migration purposes
  private readonly LEGACY_USER_ID_KEY = 'kuikui_user_id';

  constructor() {
    // Clean up any legacy data on initialization
    this.cleanupLegacyData();
  }

  /**
   * Generate a room-specific session key to isolate sessions between different rooms/windows
   */
  private getSessionKey(roomId: string): string {
    return `${this.SESSION_KEY_PREFIX}${roomId}`;
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
      const sessionKey = this.getSessionKey(roomId);
      localStorage.setItem(sessionKey, JSON.stringify(session));
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
      // If no roomId provided, try to find any session (for backward compatibility)
      let sessionData: string | null = null;
      let sessionKey: string;

      if (currentRoomId) {
        sessionKey = this.getSessionKey(currentRoomId);
        sessionData = localStorage.getItem(sessionKey);
      } else {
        // Search for any session (when no specific room is requested)
        const allKeys = Object.keys(localStorage);
        const sessionKeys = allKeys.filter(key =>
          key.startsWith(this.SESSION_KEY_PREFIX)
        );

        for (const key of sessionKeys) {
          const data = localStorage.getItem(key);
          if (data) {
            sessionData = data;
            sessionKey = key;
            break;
          }
        }
      }

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
      // Find any existing session and update it
      const allKeys = Object.keys(localStorage);
      const sessionKeys = allKeys.filter(key =>
        key.startsWith(this.SESSION_KEY_PREFIX)
      );

      for (const sessionKey of sessionKeys) {
        const sessionData = localStorage.getItem(sessionKey);
        if (sessionData) {
          const parsed = JSON.parse(sessionData) as unknown;
          if (this.isValidStoredUserSession(parsed)) {
            const session = parsed;
            session.lastActivity = Date.now();
            localStorage.setItem(sessionKey, JSON.stringify(session));
            return; // Update the first valid session found
          }
        }
      }
    } catch (error) {
      logger.error('Failed to update last activity in localStorage', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clear the stored user session for a specific room, or all sessions
   */
  clearUserSession(roomId?: string): void {
    try {
      if (roomId) {
        // Clear specific room session
        const sessionKey = this.getSessionKey(roomId);
        localStorage.removeItem(sessionKey);
      } else {
        // Clear all sessions
        const allKeys = Object.keys(localStorage);
        const sessionKeys = allKeys.filter(key =>
          key.startsWith(this.SESSION_KEY_PREFIX)
        );

        for (const sessionKey of sessionKeys) {
          localStorage.removeItem(sessionKey);
        }
      }
    } catch (error) {
      logger.error('Failed to clear user session from localStorage', {
        error: error instanceof Error ? error.message : String(error),
        roomId,
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

  /**
   * Mark session as explicitly ended (user intentionally left)
   * vs accidentally disconnected (browser crash, network issue)
   */
  markSessionAsEnded(): void {
    try {
      const session = this.getUserSession();
      if (session) {
        // Store a flag that this was an intentional leave
        const endedSession = {
          ...session,
          intentionallyLeft: true,
          endedAt: Date.now(),
        };
        const sessionKey = this.getSessionKey(session.roomId);
        localStorage.setItem(sessionKey, JSON.stringify(endedSession));
        logger.info('Marked session as intentionally ended');
      }
    } catch (error) {
      logger.error('Failed to mark session as ended', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const userPersistenceService = new UserPersistenceService();
