/**
 * UserList Component Test Suite
 *
 * Tests for the user list sidebar component:
 * - User rendering and display
 * - Online/offline status indicators
 * - Typing indicator display
 * - Owner badge display
 * - Current user highlighting
 * - User list sorting (owner first)
 * - Edge cases and dynamic updates
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UserList from '../UserList';
import type { User, TypingStatus } from '../../types';

describe('UserList', () => {
  // Sample test data
  const sampleUsers: User[] = [
    {
      id: 'user-1',
      nickname: 'Alice',
      socketId: 'socket-1',
      joinedAt: new Date('2025-10-26T10:00:00'),
      isOnline: true,
    },
    {
      id: 'user-2',
      nickname: 'Bob',
      socketId: 'socket-2',
      joinedAt: new Date('2025-10-26T10:01:00'),
      isOnline: true,
    },
    {
      id: 'user-3',
      nickname: 'Charlie',
      socketId: 'socket-3',
      joinedAt: new Date('2025-10-26T10:02:00'),
      isOnline: false,
    },
  ];

  const typingUsers: TypingStatus[] = [
    {
      userId: 'user-1',
      nickname: 'Alice',
      isTyping: true,
    },
  ];

  describe('Rendering', () => {
    it('should render user list', () => {
      render(
        <UserList users={sampleUsers} typingUsers={[]} currentUserId='user-1' />
      );

      expect(screen.getByText(/Users \(3\)/)).toBeInTheDocument();
    });

    it('should render all users', () => {
      render(
        <UserList users={sampleUsers} typingUsers={[]} currentUserId='user-1' />
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should render empty user list', () => {
      render(<UserList users={[]} typingUsers={[]} />);

      expect(screen.getByText(/Users \(0\)/)).toBeInTheDocument();
    });

    it('should show user count correctly', () => {
      const { rerender } = render(
        <UserList users={[sampleUsers[0]]} typingUsers={[]} />
      );

      expect(screen.getByText(/Users \(1\)/)).toBeInTheDocument();

      rerender(<UserList users={sampleUsers} typingUsers={[]} />);

      expect(screen.getByText(/Users \(3\)/)).toBeInTheDocument();
    });
  });

  describe('User Status', () => {
    it('should show online status', () => {
      const { container } = render(
        <UserList users={sampleUsers} typingUsers={[]} currentUserId='user-1' />
      );

      // Online users should have green indicator
      const onlineIndicators = container.querySelectorAll('.bg-green-500');
      expect(onlineIndicators.length).toBe(2); // Alice and Bob
    });

    it('should show offline status', () => {
      const { container } = render(
        <UserList users={sampleUsers} typingUsers={[]} currentUserId='user-1' />
      );

      // Offline users should have gray indicator
      const offlineIndicators = container.querySelectorAll('.bg-gray-400');
      expect(offlineIndicators.length).toBe(1); // Charlie
    });
  });

  describe('Typing Indicator', () => {
    it('should show typing indicator for typing users', () => {
      render(
        <UserList
          users={sampleUsers}
          typingUsers={typingUsers}
          currentUserId='user-2'
        />
      );

      expect(screen.getByText(/typing/i)).toBeInTheDocument();
    });

    it('should not show typing indicator when no one is typing', () => {
      render(
        <UserList users={sampleUsers} typingUsers={[]} currentUserId='user-1' />
      );

      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();
    });

    it('should show multiple typing indicators', () => {
      const multipleTyping: TypingStatus[] = [
        { userId: 'user-1', nickname: 'Alice', isTyping: true },
        { userId: 'user-2', nickname: 'Bob', isTyping: true },
      ];

      render(
        <UserList
          users={sampleUsers}
          typingUsers={multipleTyping}
          currentUserId='user-3'
        />
      );

      const typingIndicators = screen.getAllByText(/typing/i);
      expect(typingIndicators.length).toBe(2);
    });
  });

  describe('Owner Badge', () => {
    it('should show owner badge for room owner', () => {
      render(
        <UserList
          users={sampleUsers}
          typingUsers={[]}
          currentUserId='user-2'
          ownerId='user-1'
        />
      );

      expect(screen.getByText(/owner/i)).toBeInTheDocument();
    });

    it('should only show one owner badge', () => {
      render(
        <UserList
          users={sampleUsers}
          typingUsers={[]}
          currentUserId='user-2'
          ownerId='user-1'
        />
      );

      const ownerBadges = screen.getAllByText(/owner/i);
      expect(ownerBadges.length).toBe(1);
    });

    it('should not show owner badge when no owner is set', () => {
      render(
        <UserList users={sampleUsers} typingUsers={[]} currentUserId='user-1' />
      );

      expect(screen.queryByText(/owner/i)).not.toBeInTheDocument();
    });

    it('should place owner first in the list', () => {
      render(
        <UserList
          users={sampleUsers}
          typingUsers={[]}
          currentUserId='user-1'
          ownerId='user-2' // Bob is owner
        />
      );

      const userElements = screen.getAllByText(/Alice|Bob|Charlie/);
      // Bob should be first
      expect(userElements[0].textContent).toContain('Bob');
    });
  });

  describe('Current User Indicator', () => {
    it('should highlight current user', () => {
      render(
        <UserList users={sampleUsers} typingUsers={[]} currentUserId='user-1' />
      );

      expect(screen.getByText(/you/i)).toBeInTheDocument();
    });

    it('should only highlight one user as current', () => {
      render(
        <UserList users={sampleUsers} typingUsers={[]} currentUserId='user-1' />
      );

      const youIndicators = screen.getAllByText(/you/i);
      expect(youIndicators.length).toBe(1);
    });

    it('should not show current user indicator when no current user', () => {
      render(<UserList users={sampleUsers} typingUsers={[]} />);

      expect(screen.queryByText(/you/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with very long nickname', () => {
      const usersWithLongName: User[] = [
        {
          ...sampleUsers[0],
          nickname: 'A'.repeat(100),
        },
      ];

      render(
        <UserList
          users={usersWithLongName}
          typingUsers={[]}
          currentUserId='user-1'
        />
      );

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    });

    it('should handle user with special characters in nickname', () => {
      const usersWithSpecialChars: User[] = [
        {
          ...sampleUsers[0],
          nickname: 'User-123_test.name',
        },
      ];

      render(
        <UserList
          users={usersWithSpecialChars}
          typingUsers={[]}
          currentUserId='user-1'
        />
      );

      expect(screen.getByText('User-123_test.name')).toBeInTheDocument();
    });

    it('should update when users list changes', () => {
      const { rerender } = render(
        <UserList users={[sampleUsers[0]]} typingUsers={[]} />
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();

      rerender(<UserList users={sampleUsers} typingUsers={[]} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should handle rapid typing status changes', () => {
      const { rerender } = render(
        <UserList users={sampleUsers} typingUsers={[]} currentUserId='user-2' />
      );

      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();

      rerender(
        <UserList
          users={sampleUsers}
          typingUsers={typingUsers}
          currentUserId='user-2'
        />
      );

      expect(screen.getByText(/typing/i)).toBeInTheDocument();

      rerender(
        <UserList users={sampleUsers} typingUsers={[]} currentUserId='user-2' />
      );

      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();
    });
  });
});
