// Frontend validation utilities (mirrors backend validation)
// This file should stay in sync with backend/src/utils/validation.ts

export const VALIDATION_RULES = {
  nickname: {
    minLength: 1,
    maxLength: 50,
    allowedPattern: /^[a-zA-Z0-9\s\-_.]+$/,
    description:
      'Nickname must be 1-50 characters and contain only letters, numbers, spaces, hyphens, underscores, or periods',
  },
  message: {
    minLength: 1,
    maxLength: 1000,
    description: 'Message must be 1-1000 characters long',
  },
  roomId: {
    pattern:
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
    description: 'Invalid room ID format',
  },
} as const;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Nickname validation
export function validateNickname(nickname: string): ValidationResult {
  if (!nickname || typeof nickname !== 'string') {
    return {
      isValid: false,
      error: 'Nickname is required',
    };
  }

  const trimmed = nickname.trim();

  if (trimmed.length < VALIDATION_RULES.nickname.minLength) {
    return {
      isValid: false,
      error: 'Nickname cannot be empty',
    };
  }

  if (trimmed.length > VALIDATION_RULES.nickname.maxLength) {
    return {
      isValid: false,
      error: `Nickname must be no more than ${VALIDATION_RULES.nickname.maxLength} characters`,
    };
  }

  if (!VALIDATION_RULES.nickname.allowedPattern.test(trimmed)) {
    return {
      isValid: false,
      error: VALIDATION_RULES.nickname.description,
    };
  }

  return { isValid: true };
}

// Message validation
export function validateMessage(message: string): ValidationResult {
  if (!message || typeof message !== 'string') {
    return {
      isValid: false,
      error: 'Message is required',
    };
  }

  const trimmed = message.trim();

  if (trimmed.length < VALIDATION_RULES.message.minLength) {
    return {
      isValid: false,
      error: 'Message cannot be empty',
    };
  }

  if (trimmed.length > VALIDATION_RULES.message.maxLength) {
    return {
      isValid: false,
      error: `Message must be no more than ${VALIDATION_RULES.message.maxLength} characters`,
    };
  }

  // Check for prohibited content patterns
  const prohibitedPatterns = [
    /\b(?:spam|scam|phishing)\b/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Basic XSS protection
    /javascript:/gi,
    /data:text\/html/gi,
  ];

  for (const pattern of prohibitedPatterns) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        error: 'Message contains prohibited content',
      };
    }
  }

  return { isValid: true };
}

// Room ID validation
export function validateRoomId(roomId: string): ValidationResult {
  if (!roomId || typeof roomId !== 'string') {
    return {
      isValid: false,
      error: 'Room ID is required',
    };
  }

  if (!VALIDATION_RULES.roomId.pattern.test(roomId.trim())) {
    return {
      isValid: false,
      error: VALIDATION_RULES.roomId.description,
    };
  }

  return { isValid: true };
}

// Sanitize input by removing or escaping potentially harmful content
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return (
    input
      .trim()
      // Remove potential HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove potential script content
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
  );
}

// Debounce utility for real-time validation
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}
