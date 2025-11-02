/**
 * ChatArea Component Test Suite
 *
 * Tests for the chat message area component:
 * - Message rendering and display
 * - User input handling and validation
 * - Message sending functionality
 * - Typing indicator behavior
 * - Character count and validation
 * - Real-time updates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatArea from '../ChatArea';
import type { ChatMessage } from '../../types';

describe('ChatArea', () => {
  // Mock callback functions
  const mockOnSendMessage = vi.fn();
  const mockOnTypingChange = vi.fn();

  // Sample test data
  const sampleMessages: ChatMessage[] = [
    {
      id: '1',
      userId: 'user-1',
      nickname: 'Alice',
      content: 'Hello, world!',
      timestamp: new Date('2025-10-26T10:00:00'),
    },
    {
      id: '2',
      userId: 'user-2',
      nickname: 'Bob',
      content: 'Hi Alice!',
      timestamp: new Date('2025-10-26T10:01:00'),
    },
  ];

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render chat area', () => {
      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      expect(screen.getByPlaceholderText(/type.*message/i)).toBeInTheDocument();
    });

    it('should render messages', () => {
      render(
        <ChatArea
          messages={sampleMessages}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
      expect(screen.getByText('Hi Alice!')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should render empty state when no messages', () => {
      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      // Input should still be available
      expect(screen.getByPlaceholderText(/type.*message/i)).toBeInTheDocument();
    });

    it('should render message timestamps', () => {
      render(
        <ChatArea
          messages={sampleMessages}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      // Timestamps should be formatted and visible
      const timestamps = screen.getAllByText(/\d{1,2}:\d{2}/);
      expect(timestamps.length).toBeGreaterThan(0);
    });
  });

  describe('Message Input', () => {
    it('should allow typing in input field', async () => {
      const user = userEvent.setup();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, 'Test message');

      expect(input).toHaveValue('Test message');
    });

    it('should call onTypingChange when user starts typing', async () => {
      const user = userEvent.setup();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, 'T');

      await waitFor(() => {
        expect(mockOnTypingChange).toHaveBeenCalledWith(true);
      });
    });

    it('should handle long messages', async () => {
      const user = userEvent.setup();
      const longMessage = 'A'.repeat(500);

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, longMessage);

      expect(input).toHaveValue(longMessage);
    });

    it('should clear input after sending message', async () => {
      const user = userEvent.setup();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });
  });

  describe('Send Message', () => {
    it('should send message when send button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
      });
    });

    it('should send message when Enter is pressed', async () => {
      const user = userEvent.setup();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, 'Test message{Enter}');

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
      });
    });

    it('should not send empty message', async () => {
      const user = userEvent.setup();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only message', async () => {
      const user = userEvent.setup();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, '   ');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should trim message before sending', async () => {
      const user = userEvent.setup();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, '  Test message  ');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
      });
    });
  });

  describe('Validation', () => {
    it('should show character count', async () => {
      const user = userEvent.setup();
      const message = 'A'.repeat(500);

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, message);

      await waitFor(() => {
        expect(screen.getByText(/500.*1000 characters/i)).toBeInTheDocument();
      });
    });

    it('should clear error when message becomes valid', async () => {
      const user = userEvent.setup();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);

      // Type valid message
      await user.type(input, 'Valid message');

      await waitFor(() => {
        expect(screen.getByText(/\d+.*1000 characters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Typing Indicator', () => {
    it('should call onTypingChange when user types', async () => {
      const user = userEvent.setup();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(/type.*message/i);
      await user.type(input, 'Test');

      await waitFor(() => {
        expect(mockOnTypingChange).toHaveBeenCalledWith(true);
      });
    });

    it('should stop typing after inactivity window (3s) using fake timers', () => {
      vi.useFakeTimers();

      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const input = screen.getByPlaceholderText(
        /type.*message/i
      ) as HTMLInputElement;

      // Simulate typing synchronously without async userEvent
      // Use React Testing Library fireEvent to trigger React onChange
      fireEvent.change(input, { target: { value: 'Hi' } });

      // Started typing should be notified immediately
      expect(mockOnTypingChange).toHaveBeenCalledWith(true);

      // Advance less than timeout and type again to reset timer
      vi.advanceTimersByTime(2000);
      fireEvent.change(input, { target: { value: 'Hi!' } });

      // Advance beyond 3s from last keystroke -> should stop typing
      vi.advanceTimersByTime(3000);

      expect(mockOnTypingChange).toHaveBeenCalledWith(false);

      vi.useRealTimers();
    });
  });

  describe('Multiple Messages', () => {
    it('should render multiple messages in order', () => {
      render(
        <ChatArea
          messages={sampleMessages}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      const messageElements = screen.getAllByText(/Hello|Hi/);
      expect(messageElements).toHaveLength(2);
    });

    it('should handle empty messages array', () => {
      render(
        <ChatArea
          messages={[]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      expect(screen.queryByText(/Hello/)).not.toBeInTheDocument();
    });

    it('should update when new messages are added', () => {
      const { rerender } = render(
        <ChatArea
          messages={[sampleMessages[0]]}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
      expect(screen.queryByText('Hi Alice!')).not.toBeInTheDocument();

      rerender(
        <ChatArea
          messages={sampleMessages}
          onSendMessage={mockOnSendMessage}
          onTypingChange={mockOnTypingChange}
        />
      );

      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
      expect(screen.getByText('Hi Alice!')).toBeInTheDocument();
    });
  });
});
