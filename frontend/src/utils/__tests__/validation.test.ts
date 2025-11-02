import { describe, it, expect } from 'vitest';
import {
  validateNickname,
  validateRoomId,
  validateMessage,
  VALIDATION_RULES,
} from '../validation';

describe('Validation Utils', () => {
  describe('validateNickname', () => {
    it('should accept valid nicknames', () => {
      expect(validateNickname('TestUser').isValid).toBe(true);
      expect(validateNickname('User123').isValid).toBe(true);
      expect(validateNickname('test_user').isValid).toBe(true);
      expect(validateNickname('test-user').isValid).toBe(true);
      expect(validateNickname('test.user').isValid).toBe(true);
    });

    it('should return error for empty nickname', () => {
      const result = validateNickname('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for whitespace-only nickname', () => {
      const result = validateNickname('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nickname cannot be empty');
    });

    it('should return error for nickname that is too long', () => {
      const longNickname = 'a'.repeat(51);
      const result = validateNickname(longNickname);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('50 characters');
    });

    it('should accept nickname at max length', () => {
      const maxNickname = 'a'.repeat(50);
      const result = validateNickname(maxNickname);
      expect(result.isValid).toBe(true);
    });

    it('should trim whitespace and validate', () => {
      const result = validateNickname('  TestUser  ');
      expect(result.isValid).toBe(true);
    });

    it('should reject nicknames with invalid characters', () => {
      const result1 = validateNickname('test@user');
      expect(result1.isValid).toBe(false);

      const result2 = validateNickname('test!user');
      expect(result2.isValid).toBe(false);

      const result3 = validateNickname('test<user');
      expect(result3.isValid).toBe(false);
    });

    it('should handle non-string input', () => {
      const result = validateNickname(null as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Nickname is required');
    });
  });

  describe('validateRoomId', () => {
    it('should accept valid UUID v4 format', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000'; // Valid v4 UUID
      const result = validateRoomId(validUUID);
      expect(result.isValid).toBe(true);
    });

    it('should accept UUID with uppercase letters', () => {
      const validUUID = '550E8400-E29B-41D4-A716-446655440000'; // Valid v4 UUID
      const result = validateRoomId(validUUID);
      expect(result.isValid).toBe(true);
    });

    it('should return error for invalid UUID format', () => {
      const result = validateRoomId('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for short string', () => {
      const result = validateRoomId('123');
      expect(result.isValid).toBe(false);
    });

    it('should return error for empty string', () => {
      const result = validateRoomId('');
      expect(result.isValid).toBe(false);
    });

    it('should handle non-string values', () => {
      expect(validateRoomId(null as any).isValid).toBe(false);
      expect(validateRoomId(undefined as any).isValid).toBe(false);
      expect(validateRoomId(123 as any).isValid).toBe(false);
    });

    it('should reject UUID v1 format', () => {
      const uuidV1 = '550e8400-e29b-11d4-a716-446655440000';
      const result = validateRoomId(uuidV1);
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateMessage', () => {
    it('should accept valid messages', () => {
      expect(validateMessage('Hello world').isValid).toBe(true);
      expect(validateMessage('Test message 123').isValid).toBe(true);
    });

    it('should return error for empty message', () => {
      const result = validateMessage('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for whitespace-only message', () => {
      const result = validateMessage('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
    });

    it('should return error for message exceeding max length', () => {
      const longMessage = 'a'.repeat(1001);
      const result = validateMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('1000 characters');
    });

    it('should accept message at max length', () => {
      const maxMessage = 'a'.repeat(1000);
      const result = validateMessage(maxMessage);
      expect(result.isValid).toBe(true);
    });
  });

  describe('VALIDATION_RULES', () => {
    it('should export validation rules constants', () => {
      expect(VALIDATION_RULES.nickname.minLength).toBe(1);
      expect(VALIDATION_RULES.nickname.maxLength).toBe(50);
      expect(VALIDATION_RULES.message.maxLength).toBe(1000);
    });
  });
});
