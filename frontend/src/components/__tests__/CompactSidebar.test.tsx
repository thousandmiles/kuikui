/**
 * @fileoverview Test suite for CompactSidebar component
 * 
 * Tests compact sidebar with users and chat tabs:
 * - Tab switching (users/chat)
 * - Collapsed vs expanded states
 * - User list rendering with avatars
 * - Typing indicators
 * - Unread message badges
 * - Mode switching (chat/editor)
 * - Avatar colors and initials
 * 
 * @see {@link CompactSidebar} for implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CompactSidebar from '../CompactSidebar';
import { User, ChatMessage, TypingStatus } from '../../types/index';

// Mock ChatArea component
vi.mock('../ChatArea', () => ({
  default: ({ messages, onSendMessage, onTypingChange }: any) => (
    <div data-testid="chat-area">
      <div data-testid="message-count">{messages.length}</div>
      <button onClick={() => onSendMessage('test')}>Send</button>
      <button onClick={() => onTypingChange(true)}>Start Typing</button>
    </div>
  ),
}));

describe('CompactSidebar', () => {
  const mockUsers: User[] = [
    {
      id: 'user-1',
      nickname: 'Alice Smith',
      socketId: 'socket-1',
      joinedAt: new Date(),
      isOnline: true,
    },
    {
      id: 'user-2',
      nickname: 'Bob Johnson',
      socketId: 'socket-2',
      joinedAt: new Date(),
      isOnline: false,
    },
    {
      id: 'user-3',
      nickname: 'Charlie',
      socketId: 'socket-3',
      joinedAt: new Date(),
      isOnline: true,
    },
  ];

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      userId: 'user-1',
      nickname: 'Alice Smith',
      content: 'Hello',
      timestamp: new Date(),
    },
    {
      id: 'msg-2',
      userId: 'user-2',
      nickname: 'Bob Johnson',
      content: 'Hi there',
      timestamp: new Date(),
    },
  ];

  const mockTypingUsers: TypingStatus[] = [
    {
      userId: 'user-1',
      nickname: 'Alice Smith',
      isTyping: true,
    },
  ];

  const defaultProps = {
    users: mockUsers,
    typingUsers: [],
    messages: mockMessages,
    onSendMessage: vi.fn(),
    onTypingChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tab Switching', () => {
    it('should default to users tab', () => {
      render(<CompactSidebar {...defaultProps} />);

      const usersTab = screen.getByText('Users (3)').closest('button');
      expect(usersTab).toHaveClass('text-blue-600');
    });

    it('should switch to chat tab when clicked', () => {
      render(<CompactSidebar {...defaultProps} />);

      const chatTab = screen.getByText('Chat');
      fireEvent.click(chatTab);

      expect(screen.getByTestId('chat-area')).toBeInTheDocument();
    });

    it('should switch back to users tab', () => {
      render(<CompactSidebar {...defaultProps} />);

      // Switch to chat
      fireEvent.click(screen.getByText('Chat'));
      expect(screen.getByTestId('chat-area')).toBeInTheDocument();

      // Switch back to users
      fireEvent.click(screen.getByText('Users (3)'));
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      render(<CompactSidebar {...defaultProps} />);

      const usersTab = screen.getByText('Users (3)').closest('button');
      expect(usersTab).toHaveClass('text-blue-600');

      fireEvent.click(screen.getByText('Chat'));
      const chatTab = screen.getByText('Chat').closest('button');
      expect(chatTab).toHaveClass('text-blue-600');
    });
  });

  describe('Expanded View', () => {
    it('should render with correct width in chat mode', () => {
      const { container } = render(
        <CompactSidebar {...defaultProps} mode="chat" />
      );

      expect(container.firstChild).toHaveClass('w-64');
    });

    it('should render with correct width in editor mode', () => {
      const { container } = render(
        <CompactSidebar {...defaultProps} mode="editor" />
      );

      expect(container.firstChild).toHaveClass('w-80');
    });

    it('should display all users in expanded view', () => {
      render(<CompactSidebar {...defaultProps} />);

      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should show user initials in avatars', () => {
      render(<CompactSidebar {...defaultProps} />);

      expect(screen.getByText('AS')).toBeInTheDocument(); // Alice Smith
      expect(screen.getByText('BJ')).toBeInTheDocument(); // Bob Johnson
      expect(screen.getByText('C')).toBeInTheDocument(); // Charlie (single word)
    });

    it('should highlight current user', () => {
      render(<CompactSidebar {...defaultProps} currentUserId="user-1" />);

      const aliceContainer = screen.getByText('Alice Smith').closest('div');
      expect(aliceContainer).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('should show online status indicator', () => {
      const { container } = render(<CompactSidebar {...defaultProps} />);

      const greenDots = container.querySelectorAll('.bg-green-500');
      const grayDots = container.querySelectorAll('.bg-gray-400');

      // 2 users online, 1 offline in expanded view
      expect(greenDots.length).toBeGreaterThanOrEqual(2);
      expect(grayDots.length).toBeGreaterThanOrEqual(1);
    });

    it('should show unread count badge on chat tab', () => {
      render(<CompactSidebar {...defaultProps} unreadCount={5} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should show "9+" for unread counts over 9', () => {
      render(<CompactSidebar {...defaultProps} unreadCount={15} />);

      expect(screen.getByText('9+')).toBeInTheDocument();
    });

    it('should not show unread badge when count is 0', () => {
      render(<CompactSidebar {...defaultProps} unreadCount={0} />);

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Collapsed View', () => {
    it('should render narrow sidebar when collapsed', () => {
      const { container } = render(
        <CompactSidebar {...defaultProps} isCollapsed={true} />
      );

      expect(container.firstChild).toHaveClass('w-16');
    });

    it('should show icon buttons in collapsed view', () => {
      render(<CompactSidebar {...defaultProps} isCollapsed={true} />);

      // Check for SVG icons (users and chat)
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2); // Users and Chat buttons
    });

    it('should show compact user avatars when collapsed', () => {
      render(<CompactSidebar {...defaultProps} isCollapsed={true} />);

      // Should show initials for first few users
      expect(screen.getByText('AS')).toBeInTheDocument();
      expect(screen.getByText('BJ')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument(); // Charlie (single word)
    });

    it('should limit visible users to 5 in collapsed view', () => {
      const manyUsers: User[] = Array.from({ length: 8 }, (_, i) => ({
        id: `user-${i}`,
        nickname: `User ${i}`,
        socketId: `socket-${i}`,
        joinedAt: new Date(),
        isOnline: true,
      }));

      render(
        <CompactSidebar
          {...defaultProps}
          users={manyUsers}
          isCollapsed={true}
        />
      );

      // Should show +3 for remaining users (8 total - 5 visible)
      expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('should show unread badge in collapsed view', () => {
      render(
        <CompactSidebar
          {...defaultProps}
          unreadCount={3}
          isCollapsed={true}
        />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should switch tabs in collapsed view', () => {
      render(<CompactSidebar {...defaultProps} isCollapsed={true} />);

      const buttons = screen.getAllByRole('button');
      const chatButton = buttons[1]; // Second button is chat

      fireEvent.click(chatButton);

      // Chat area should not be visible in collapsed view
      expect(screen.queryByTestId('chat-area')).not.toBeInTheDocument();
    });

    it('should highlight active tab in collapsed view', () => {
      render(<CompactSidebar {...defaultProps} isCollapsed={true} />);

      const buttons = screen.getAllByRole('button');
      const usersButton = buttons[0];

      expect(usersButton).toHaveClass('bg-blue-100', 'text-blue-600');
    });
  });

  describe('User Initials', () => {
    it('should extract two initials from multi-word names', () => {
      render(<CompactSidebar {...defaultProps} />);

      expect(screen.getByText('AS')).toBeInTheDocument(); // Alice Smith
      expect(screen.getByText('BJ')).toBeInTheDocument(); // Bob Johnson
    });

    it('should handle single-word names', () => {
      render(<CompactSidebar {...defaultProps} />);

      // "Charlie" should show "C" (first letter only for single-word names)
      expect(screen.getByText('C')).toBeInTheDocument();
    });

    it('should uppercase initials', () => {
      const lowercaseUser: User[] = [
        {
          id: 'user-x',
          nickname: 'alice smith',
          socketId: 'socket-x',
          joinedAt: new Date(),
          isOnline: true,
        },
      ];

      render(<CompactSidebar {...defaultProps} users={lowercaseUser} />);

      expect(screen.getByText('AS')).toBeInTheDocument();
    });

    it('should limit initials to 2 characters', () => {
      const longNameUser: User[] = [
        {
          id: 'user-long',
          nickname: 'Alice Bob Charlie',
          socketId: 'socket-long',
          joinedAt: new Date(),
          isOnline: true,
        },
      ];

      render(<CompactSidebar {...defaultProps} users={longNameUser} />);

      // Should be "AB" not "ABC"
      expect(screen.getByText('AB')).toBeInTheDocument();
    });
  });

  describe('Typing Indicators', () => {
    it('should show typing indicator for single user in expanded view', () => {
      render(
        <CompactSidebar {...defaultProps} typingUsers={mockTypingUsers} />
      );

      expect(screen.getByText('Alice Smith is typing...')).toBeInTheDocument();
    });

    it('should show typing count for multiple users in expanded view', () => {
      const multipleTyping: TypingStatus[] = [
        { userId: 'user-1', nickname: 'Alice', isTyping: true },
        { userId: 'user-2', nickname: 'Bob', isTyping: true },
      ];

      render(<CompactSidebar {...defaultProps} typingUsers={multipleTyping} />);

      expect(screen.getByText('2 people are typing...')).toBeInTheDocument();
    });

    it('should show typing indicator in collapsed view', () => {
      render(
        <CompactSidebar
          {...defaultProps}
          typingUsers={mockTypingUsers}
          isCollapsed={true}
        />
      );

      expect(screen.getByText('Alice Smith typing...')).toBeInTheDocument();
    });

    it('should show typing count in collapsed view for multiple users', () => {
      const multipleTyping: TypingStatus[] = [
        { userId: 'user-1', nickname: 'Alice', isTyping: true },
        { userId: 'user-2', nickname: 'Bob', isTyping: true },
      ];

      render(
        <CompactSidebar
          {...defaultProps}
          typingUsers={multipleTyping}
          isCollapsed={true}
        />
      );

      expect(screen.getByText('2 typing...')).toBeInTheDocument();
    });

    it('should not show typing indicator when no one is typing', () => {
      render(<CompactSidebar {...defaultProps} typingUsers={[]} />);

      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();
    });
  });

  describe('Chat Integration', () => {
    it('should render ChatArea component when chat tab is active', () => {
      render(<CompactSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Chat'));

      expect(screen.getByTestId('chat-area')).toBeInTheDocument();
    });

    it('should pass messages to ChatArea', () => {
      render(<CompactSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Chat'));

      expect(screen.getByTestId('message-count')).toHaveTextContent('2');
    });

    it('should pass onSendMessage callback to ChatArea', () => {
      const onSendMessage = vi.fn();
      render(<CompactSidebar {...defaultProps} onSendMessage={onSendMessage} />);

      fireEvent.click(screen.getByText('Chat'));
      fireEvent.click(screen.getByText('Send'));

      expect(onSendMessage).toHaveBeenCalledWith('test');
    });

    it('should pass onTypingChange callback to ChatArea', () => {
      const onTypingChange = vi.fn();
      render(
        <CompactSidebar {...defaultProps} onTypingChange={onTypingChange} />
      );

      fireEvent.click(screen.getByText('Chat'));
      fireEvent.click(screen.getByText('Start Typing'));

      expect(onTypingChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Avatar Colors', () => {
    it('should assign consistent colors based on user ID', () => {
      const { container } = render(<CompactSidebar {...defaultProps} />);

      // Each user should have a colored avatar
      const colorClasses = [
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-yellow-500',
        'bg-red-500',
        'bg-teal-500',
      ];

      const avatars = container.querySelectorAll('[class*="bg-"]');
      let hasColorClass = false;

      avatars.forEach(avatar => {
        const classes = Array.from(avatar.classList);
        if (colorClasses.some(color => classes.includes(color))) {
          hasColorClass = true;
        }
      });

      expect(hasColorClass).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty user list', () => {
      render(<CompactSidebar {...defaultProps} users={[]} />);

      expect(screen.getByText('Users (0)')).toBeInTheDocument();
    });

    it('should handle empty messages list', () => {
      render(<CompactSidebar {...defaultProps} messages={[]} />);

      fireEvent.click(screen.getByText('Chat'));

      expect(screen.getByTestId('message-count')).toHaveTextContent('0');
    });

    it('should handle single user', () => {
      render(<CompactSidebar {...defaultProps} users={[mockUsers[0]]} />);

      expect(screen.getByText('Users (1)')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    it('should handle user without currentUserId', () => {
      render(<CompactSidebar {...defaultProps} currentUserId={undefined} />);

      // All users should have default styling (no highlight)
      const aliceContainer = screen.getByText('Alice Smith').closest('div');
      expect(aliceContainer).not.toHaveClass('bg-blue-100');
    });

    it('should handle ownerId prop (legacy compatibility)', () => {
      // ownerId is accepted but not displayed in condensed view
      expect(() => {
        render(<CompactSidebar {...defaultProps} ownerId="user-1" />);
      }).not.toThrow();
    });

    it('should display tooltip with online status in collapsed view', () => {
      const { container } = render(
        <CompactSidebar {...defaultProps} isCollapsed={true} />
      );

      const avatar = container.querySelector('[title*="online"]');
      expect(avatar).toBeInTheDocument();
    });
  });

  describe('UI States', () => {
    it('should apply correct styling to active users tab', () => {
      render(<CompactSidebar {...defaultProps} />);

      const usersTab = screen.getByText('Users (3)');
      expect(usersTab.closest('button')).toHaveClass(
        'text-blue-600',
        'border-b-2',
        'border-blue-600',
        'bg-blue-50'
      );
    });

    it('should apply correct styling to active chat tab', () => {
      render(<CompactSidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Chat'));

      const chatTab = screen.getByText('Chat');
      expect(chatTab.closest('button')).toHaveClass(
        'text-blue-600',
        'border-b-2',
        'border-blue-600',
        'bg-blue-50'
      );
    });

    it('should show border and background styling', () => {
      const { container } = render(<CompactSidebar {...defaultProps} />);

      expect(container.firstChild).toHaveClass(
        'bg-white',
        'border-r',
        'border-gray-200'
      );
    });
  });
});
