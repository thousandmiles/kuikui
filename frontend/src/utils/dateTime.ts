// DateTime utility functions for consistent timestamp formatting

export interface FormatTimeOptions {
  includeSeconds?: boolean;
  includeDate?: boolean;
  use24Hour?: boolean;
  showRelative?: boolean;
}

/**
 * Format a timestamp for display in chat messages
 * Automatically handles different scenarios:
 * - Same day: Just time (e.g., "2:30 PM")
 * - Yesterday: "Yesterday 2:30 PM"
 * - This week: Day name + time (e.g., "Monday 2:30 PM")
 * - Older: Full date + time (e.g., "Sep 15, 2:30 PM")
 */
export function formatMessageTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();

  // Check if the timestamp is invalid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Format time portion
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const timeString = date.toLocaleTimeString([], timeOptions);

  // Same day - just show time
  if (diffDays === 0 && date.toDateString() === now.toDateString()) {
    return timeString;
  }

  // Yesterday
  if (diffDays === 1) {
    return `Yesterday ${timeString}`;
  }

  // This week (within 7 days)
  if (diffDays < 7) {
    const dayName = date.toLocaleDateString([], { weekday: 'short' });
    return `${dayName} ${timeString}`;
  }

  // Older - show date and time
  const dateString = date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
  });

  return `${dateString} ${timeString}`;
}

/**
 * Format a timestamp with custom options
 */
export function formatTimestamp(
  timestamp: Date | string,
  options: FormatTimeOptions = {}
): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const {
    includeSeconds = false,
    includeDate = false,
    use24Hour = false,
    showRelative = false,
  } = options;

  if (showRelative) {
    return formatRelativeTime(date);
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24Hour,
  };

  if (includeSeconds) {
    formatOptions.second = '2-digit';
  }

  if (includeDate) {
    formatOptions.year = 'numeric';
    formatOptions.month = 'short';
    formatOptions.day = 'numeric';
  }

  return date.toLocaleString([], formatOptions);
}

/**
 * Format relative time (e.g., "2 minutes ago", "1 hour ago")
 */
export function formatRelativeTime(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();

  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    // For older messages, fall back to absolute time
    return formatMessageTimestamp(date);
  }
}

/**
 * Get user's timezone abbreviation
 */
export function getUserTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const shortTimezone = new Date()
      .toLocaleDateString('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
      })
      .split(', ')[1];
    return shortTimezone || timezone;
  } catch {
    return 'Local';
  }
}

/**
 * Format a timestamp with timezone information
 */
export function formatTimestampWithTimezone(timestamp: Date | string): string {
  const formatted = formatMessageTimestamp(timestamp);
  const timezone = getUserTimezone();
  return `${formatted} (${timezone})`;
}
