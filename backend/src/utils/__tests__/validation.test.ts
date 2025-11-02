/**
 * Validation Utils Test Suite
 * 
 * Comprehensive tests for validation functions including:
 * - Nickname validation (length, format, special characters)
 * - Message validation (length, prohibited content, XSS protection)
 * - Room ID validation (UUID v4 format)
 * - Input sanitization (HTML removal, protocol filtering)
 * - Rate limiting functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateNickname,
  validateMessage,
  validateRoomId,
  sanitizeInput,
  RateLimiter,
  ValidationError,
  VALIDATION_RULES,
} from '../validation';

describe('Validation Utils', () => {
  describe('VALIDATION_RULES', () => {
    it('should export validation rules constants', () => {
      expect(VALIDATION_RULES.nickname.minLength).toBe(1);
      expect(VALIDATION_RULES.nickname.maxLength).toBe(50);
      expect(VALIDATION_RULES.message.minLength).toBe(1);
      expect(VALIDATION_RULES.message.maxLength).toBe(1000);
      expect(VALIDATION_RULES.roomId.pattern).toBeInstanceOf(RegExp);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with correct name', () => {
      const error = new ValidationError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test error');
    });
  });

  describe('validateNickname', () => {
    it('should accept valid nicknames', () => {
      const validNicknames = [
        'Alice',
        'Bob123',
        'user_name',
        'test-user',
        'user.name',
        'John Doe',
        'a',
        'A'.repeat(50), // Max length
      ];

      validNicknames.forEach((nickname) => {
        const result = validateNickname(nickname);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should return error for empty nickname', () => {
      const result = validateNickname('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nickname is required');
    });

    it('should return error for whitespace-only nickname', () => {
      const result = validateNickname('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nickname cannot be empty');
    });

    it('should return error for nickname that is too long', () => {
      const longNickname = 'A'.repeat(51);
      const result = validateNickname(longNickname);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('no more than 50 characters');
    });

    it('should accept nickname at max length', () => {
      const nickname = 'A'.repeat(50);
      const result = validateNickname(nickname);
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace and validate', () => {
      const result = validateNickname('  Alice  ');
      expect(result.isValid).toBe(true);
    });

    it('should reject nicknames with invalid characters', () => {
      const invalidNicknames = [
        'user@name',
        'user#name',
        'user$name',
        'user%name',
        'user&name',
        'user*name',
      ];

      invalidNicknames.forEach((nickname) => {
        const result = validateNickname(nickname);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('letters, numbers');
      });
    });

    it('should handle non-string input', () => {
      const result = validateNickname(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nickname is required');
    });

    it('should handle undefined input', () => {
      const result = validateNickname(undefined as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nickname is required');
    });

    it('should handle number input', () => {
      const result = validateNickname(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nickname is required');
    });
  });

  describe('validateMessage', () => {
    it('should accept valid messages', () => {
      const validMessages = [
        'Hello, world!',
        'This is a test message.',
        'A'.repeat(1000), // Max length
        '123',
        'Multi\nline\nmessage',
        'Special chars: !@#$%^&*()',
      ];

      validMessages.forEach((message) => {
        const result = validateMessage(message);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should return error for empty message', () => {
      const result = validateMessage('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message is required');
    });

    it('should return error for whitespace-only message', () => {
      const result = validateMessage('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('should return error for message exceeding max length', () => {
      const longMessage = 'A'.repeat(1001);
      const result = validateMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('no more than 1000 characters');
    });

    it('should accept message at max length', () => {
      const message = 'A'.repeat(1000);
      const result = validateMessage(message);
      expect(result.isValid).toBe(true);
    });

    it('should handle non-string input', () => {
      const result = validateMessage(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message is required');
    });

    it('should reject messages with prohibited patterns - spam', () => {
      const result = validateMessage('This is spam content');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains prohibited content');
    });

    it('should reject messages with prohibited patterns - scam', () => {
      const result = validateMessage('This is a scam');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains prohibited content');
    });

    it('should reject messages with prohibited patterns - phishing', () => {
      const result = validateMessage('Phishing attempt');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains prohibited content');
    });

    it('should reject messages with script tags', () => {
      const result = validateMessage('<script>alert("xss")</script>');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains prohibited content');
    });

    it('should reject messages with javascript: protocol', () => {
      const result = validateMessage('javascript:alert("xss")');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains prohibited content');
    });

    it('should reject messages with data:text/html', () => {
      const result = validateMessage('data:text/html,<script>alert("xss")</script>');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message contains prohibited content');
    });

    it('should be case-insensitive for prohibited patterns', () => {
      const patterns = ['SPAM', 'SpAm', 'SCAM', 'ScAm', 'PHISHING', 'PhIsHiNg'];
      patterns.forEach((pattern) => {
        const result = validateMessage(`This is ${pattern}`);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateRoomId', () => {
    it('should accept valid UUID v4 format', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      ];

      validUUIDs.forEach((uuid) => {
        const result = validateRoomId(uuid);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should accept UUID with uppercase letters', () => {
      const result = validateRoomId('550E8400-E29B-41D4-A716-446655440000');
      expect(result.isValid).toBe(true);
    });

    it('should accept UUID with mixed case', () => {
      const result = validateRoomId('550e8400-E29b-41d4-A716-446655440000');
      expect(result.isValid).toBe(true);
    });

    it('should return error for invalid UUID format', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        'invalid-uuid-format',
        '550e8400-e29b-41d4-a716', // Too short
        '550e8400-e29b-41d4-a716-446655440000-extra', // Too long
        '550e8400-e29b-31d4-a716-446655440000', // Wrong version (v3 instead of v4)
      ];

      invalidUUIDs.forEach((uuid) => {
        const result = validateRoomId(uuid);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid room ID format');
      });
    });

    it('should return error for empty string', () => {
      const result = validateRoomId('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Room ID is required');
    });

    it('should handle non-string values', () => {
      const result = validateRoomId(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Room ID is required');
    });

    it('should reject UUID v1 format', () => {
      const uuidV1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const result = validateRoomId(uuidV1);
      expect(result.isValid).toBe(false);
    });

    it('should reject UUID v5 format', () => {
      const uuidV5 = '6ba7b810-9dad-51d1-80b4-00c04fd430c8';
      const result = validateRoomId(uuidV5);
      expect(result.isValid).toBe(false);
    });

    it('should trim whitespace before validation', () => {
      const result = validateRoomId('  550e8400-e29b-41d4-a716-446655440000  ');
      expect(result.isValid).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeInput('<div>hello</div>')).toBe('hello');
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeInput('<b>bold</b> text')).toBe('bold text');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert("xss")')).toBe('alert("xss")');
      expect(sanitizeInput('JAVASCRIPT:alert("xss")')).toBe('alert("xss")');
    });

    it('should remove data:text/html protocol', () => {
      expect(sanitizeInput('data:text/html,<script>test</script>')).toBe(',test');
      expect(sanitizeInput('DATA:TEXT/HTML,content')).toBe(',content');
    });

    it('should normalize whitespace', () => {
      expect(sanitizeInput('hello    world')).toBe('hello world');
      expect(sanitizeInput('hello\n\nworld')).toBe('hello world');
      expect(sanitizeInput('hello\t\tworld')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
      expect(sanitizeInput(123 as any)).toBe('');
    });

    it('should handle complex HTML with multiple tags', () => {
      const html = '<p>Hello <b>world</b> <i>test</i></p>';
      expect(sanitizeInput(html)).toBe('Hello world test');
    });

    it('should handle nested HTML tags', () => {
      const html = '<div><span><b>nested</b></span></div>';
      expect(sanitizeInput(html)).toBe('nested');
    });

    it('should preserve safe text content', () => {
      expect(sanitizeInput('Hello, world! 123')).toBe('Hello, world! 123');
      expect(sanitizeInput('Special chars: !@#$%')).toBe('Special chars: !@#$%');
    });
  });

  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      vi.useFakeTimers();
      rateLimiter = new RateLimiter(3, 1000); // 3 requests per second
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should allow requests within limit', () => {
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(true);
    });

    it('should deny requests exceeding limit', () => {
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user1');
      expect(rateLimiter.isAllowed('user1')).toBe(false);
    });

    it('should track different users separately', () => {
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user1');

      // User2 should still be allowed
      expect(rateLimiter.isAllowed('user2')).toBe(true);
      expect(rateLimiter.isAllowed('user2')).toBe(true);
      expect(rateLimiter.isAllowed('user2')).toBe(true);

      // User1 should be blocked
      expect(rateLimiter.isAllowed('user1')).toBe(false);
    });

    it('should reset after time window', () => {
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user1');
      expect(rateLimiter.isAllowed('user1')).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(1001);

      expect(rateLimiter.isAllowed('user1')).toBe(true);
    });

    it('should cleanup expired limits', () => {
      rateLimiter.isAllowed('user1');
      rateLimiter.isAllowed('user2');

      // Advance time past the window
      vi.advanceTimersByTime(1001);

      rateLimiter.cleanup();

      // After cleanup, both users should be able to make new requests
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user2')).toBe(true);
    });

    it('should use custom limits', () => {
      const customLimiter = new RateLimiter(5, 2000);
      
      for (let i = 0; i < 5; i++) {
        expect(customLimiter.isAllowed('user1')).toBe(true);
      }
      expect(customLimiter.isAllowed('user1')).toBe(false);
    });

    it('should handle rapid consecutive requests', () => {
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(false);
      expect(rateLimiter.isAllowed('user1')).toBe(false);
    });

    it('should reset count after window expires', () => {
      rateLimiter.isAllowed('user1');
      
      vi.advanceTimersByTime(1001);
      
      // After window expires, should get a fresh count
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(true);
      expect(rateLimiter.isAllowed('user1')).toBe(false);
    });
  });
});
