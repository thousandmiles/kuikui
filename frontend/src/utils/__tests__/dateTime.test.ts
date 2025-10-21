import { describe, it, expect } from 'vitest';
import {
  formatMessageTimestamp,
  formatTimestamp,
  formatRelativeTime,
} from '../dateTime';

describe('DateTime Utils', () => {
  describe('formatMessageTimestamp', () => {
    it('should format timestamp correctly', () => {
      const date = new Date('2025-10-20T15:30:00Z');
      const formatted = formatMessageTimestamp(date);

      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should handle Date object', () => {
      const date = new Date();
      const formatted = formatMessageTimestamp(date);

      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should handle string timestamp', () => {
      const timestamp = '2025-10-20T15:30:00Z';
      const formatted = formatMessageTimestamp(timestamp);

      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });

    it('should handle invalid date', () => {
      const formatted = formatMessageTimestamp('invalid');

      expect(formatted).toBe('Invalid date');
    });
  });

  describe('formatTimestamp', () => {
    it('should format timestamp with options', () => {
      const date = new Date('2025-10-20T15:30:00Z');
      const formatted = formatTimestamp(date, {
        includeSeconds: true,
        includeDate: true,
      });

      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format relative time', () => {
      const date = new Date();
      const formatted = formatRelativeTime(date);

      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });
});
