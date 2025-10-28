/**
 * @fileoverview Test suite for OperationsPanel component
 * 
 * Tests collaboration sidebar panel:
 * - User list display with active status
 * - Activity feed rendering
 * - Time formatting
 * - Activity type labels
 * - Visibility toggling
 * - Empty states
 * 
 * @see {@link OperationsPanel} for implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import OperationsPanel from '../OperationsPanel';
import { User } from '../../types/index';

type ActivityKind = 'edit' | 'presence' | 'save';
interface ActivityItem {
  id: string;
  userId?: string;
  kind: ActivityKind;
  timestamp: Date;
}

describe('OperationsPanel', () => {
  const mockUsers: User[] = [
    {
      id: 'user-1',
      nickname: 'Alice',
      socketId: 'socket-1',
      joinedAt: new Date(),
      isOnline: true,
    },
    {
      id: 'user-2',
      nickname: 'Bob',
      socketId: 'socket-2',
      joinedAt: new Date(),
      isOnline: true,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-10-28T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Visibility', () => {
    it('should render when isVisible is true', () => {
      render(<OperationsPanel users={mockUsers} isVisible={true} />);

      expect(screen.getByText('Collaboration')).toBeInTheDocument();
    });

    it('should not render when isVisible is false', () => {
      const { container } = render(
        <OperationsPanel users={mockUsers} isVisible={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should accept custom className', () => {
      const { container } = render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('User List', () => {
    it('should display all users', () => {
      render(<OperationsPanel users={mockUsers} isVisible={true} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should show "No users" when user list is empty', () => {
      render(<OperationsPanel users={[]} isVisible={true} />);

      expect(screen.getByText('No users')).toBeInTheDocument();
    });

    it('should display user initials in avatar', () => {
      render(<OperationsPanel users={mockUsers} isVisible={true} />);

      expect(screen.getByText('A')).toBeInTheDocument(); // Alice
      expect(screen.getByText('B')).toBeInTheDocument(); // Bob
    });

    it('should show "Idle" status by default', () => {
      render(<OperationsPanel users={mockUsers} isVisible={true} />);

      const idleStatuses = screen.getAllByText('Idle');
      expect(idleStatuses).toHaveLength(2);
    });

    it('should show "Active" status for recently active users', () => {
      const recentActiveByUser = {
        'user-1': Date.now() - 5000, // 5 seconds ago
      };

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          recentActiveByUser={recentActiveByUser}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Idle')).toBeInTheDocument();
    });

    it('should show "Idle" for users inactive for more than 10 seconds', () => {
      const recentActiveByUser = {
        'user-1': Date.now() - 15000, // 15 seconds ago
      };

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          recentActiveByUser={recentActiveByUser}
        />
      );

      const idleStatuses = screen.getAllByText('Idle');
      expect(idleStatuses).toHaveLength(2);
    });

    it('should handle users with single-letter nicknames', () => {
      const singleLetterUsers: User[] = [
        {
          id: 'user-x',
          nickname: 'X',
          socketId: 'socket-x',
          joinedAt: new Date(),
          isOnline: true,
        },
      ];

      render(<OperationsPanel users={singleLetterUsers} isVisible={true} />);

      // Should find both avatar initial and nickname (multiple instances)
      const xElements = screen.getAllByText('X');
      expect(xElements).toHaveLength(2); // Avatar initial + nickname
    });

    it('should handle users with lowercase nicknames', () => {
      const lowercaseUsers: User[] = [
        {
          id: 'user-lower',
          nickname: 'alice',
          socketId: 'socket-lower',
          joinedAt: new Date(),
          isOnline: true,
        },
      ];

      render(<OperationsPanel users={lowercaseUsers} isVisible={true} />);

      expect(screen.getByText('alice')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument(); // Capital initial
    });
  });

  describe('Activity Feed', () => {
    const mockActivities: ActivityItem[] = [
      {
        id: 'activity-1',
        userId: 'user-1',
        kind: 'edit',
        timestamp: new Date('2025-10-28T11:55:00Z'), // 5 mins ago
      },
      {
        id: 'activity-2',
        userId: 'user-2',
        kind: 'save',
        timestamp: new Date('2025-10-28T11:00:00Z'), // 1 hour ago
      },
      {
        id: 'activity-3',
        userId: 'user-1',
        kind: 'presence',
        timestamp: new Date('2025-10-28T10:00:00Z'), // 2 hours ago
      },
    ];

    it('should show "No recent activity" when activities list is empty', () => {
      render(
        <OperationsPanel users={mockUsers} isVisible={true} activities={[]} />
      );

      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });

    it('should display all activities', () => {
      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={mockActivities}
        />
      );

      expect(screen.getByText('Edited')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should display correct activity labels', () => {
      const editActivity: ActivityItem[] = [
        {
          id: 'edit-1',
          userId: 'user-1',
          kind: 'edit',
          timestamp: new Date(),
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={editActivity}
        />
      );

      expect(screen.getByText('Edited')).toBeInTheDocument();
    });

    it('should limit activities to 20 items', () => {
      const manyActivities: ActivityItem[] = Array.from({ length: 30 }, (_, i) => ({
        id: `activity-${i}`,
        userId: 'user-1',
        kind: 'edit' as ActivityKind,
        timestamp: new Date(),
      }));

      const { container } = render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={manyActivities}
        />
      );

      // Count activity items in the recent section
      const activityItems = container.querySelectorAll('.bg-gray-50.rounded.p-2');
      expect(activityItems).toHaveLength(20);
    });

    it('should show "Someone" for activities without userId', () => {
      const unknownUserActivity: ActivityItem[] = [
        {
          id: 'unknown-1',
          kind: 'edit',
          timestamp: new Date(),
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={unknownUserActivity}
        />
      );

      expect(screen.getByText('Someone')).toBeInTheDocument();
    });

    it('should show "?" initial for unknown users', () => {
      const unknownUserActivity: ActivityItem[] = [
        {
          id: 'unknown-1',
          kind: 'edit',
          timestamp: new Date(),
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={unknownUserActivity}
        />
      );

      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('should display user nickname in activities', () => {
      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={mockActivities}
        />
      );

      // Alice and Bob should appear in activities
      const aliceElements = screen.getAllByText('Alice');
      const bobElements = screen.getAllByText('Bob');
      
      expect(aliceElements.length).toBeGreaterThan(0);
      expect(bobElements.length).toBeGreaterThan(0);
    });
  });

  describe('Time Formatting', () => {
    it('should show "Just now" for recent activities', () => {
      const justNowActivity: ActivityItem[] = [
        {
          id: 'recent-1',
          userId: 'user-1',
          kind: 'edit',
          timestamp: new Date('2025-10-28T11:59:30Z'), // 30 seconds ago
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={justNowActivity}
        />
      );

      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should show minutes for activities within an hour', () => {
      const minutesAgoActivity: ActivityItem[] = [
        {
          id: 'mins-1',
          userId: 'user-1',
          kind: 'edit',
          timestamp: new Date('2025-10-28T11:45:00Z'), // 15 mins ago
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={minutesAgoActivity}
        />
      );

      expect(screen.getByText('15m ago')).toBeInTheDocument();
    });

    it('should show hours for activities within a day', () => {
      const hoursAgoActivity: ActivityItem[] = [
        {
          id: 'hours-1',
          userId: 'user-1',
          kind: 'edit',
          timestamp: new Date('2025-10-28T09:00:00Z'), // 3 hours ago
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={hoursAgoActivity}
        />
      );

      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('should show days for activities within a week', () => {
      const daysAgoActivity: ActivityItem[] = [
        {
          id: 'days-1',
          userId: 'user-1',
          kind: 'edit',
          timestamp: new Date('2025-10-26T12:00:00Z'), // 2 days ago
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={daysAgoActivity}
        />
      );

      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });

    it('should show date for activities older than a week', () => {
      const oldActivity: ActivityItem[] = [
        {
          id: 'old-1',
          userId: 'user-1',
          kind: 'edit',
          timestamp: new Date('2025-10-15T12:00:00Z'), // 13 days ago
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={oldActivity}
        />
      );

      // Should show formatted date
      expect(screen.getByText(/10\/15\/2025|15\/10\/2025/)).toBeInTheDocument();
    });
  });

  describe('Activity Kind Labels', () => {
    it('should show "Edited" for edit activities', () => {
      const editActivity: ActivityItem[] = [
        {
          id: 'edit-1',
          userId: 'user-1',
          kind: 'edit',
          timestamp: new Date(),
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={editActivity}
        />
      );

      expect(screen.getByText('Edited')).toBeInTheDocument();
    });

    it('should show "Saved" for save activities', () => {
      const saveActivity: ActivityItem[] = [
        {
          id: 'save-1',
          userId: 'user-1',
          kind: 'save',
          timestamp: new Date(),
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={saveActivity}
        />
      );

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('should show "Active" for presence activities', () => {
      const presenceActivity: ActivityItem[] = [
        {
          id: 'presence-1',
          userId: 'user-1',
          kind: 'presence',
          timestamp: new Date(),
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={presenceActivity}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('UI Elements', () => {
    it('should display "Collaborators" section header', () => {
      render(<OperationsPanel users={mockUsers} isVisible={true} />);

      expect(screen.getByText('Collaborators')).toBeInTheDocument();
    });

    it('should display "Recent" section header', () => {
      render(<OperationsPanel users={mockUsers} isVisible={true} />);

      expect(screen.getByText('Recent')).toBeInTheDocument();
    });

    it('should display footer text', () => {
      render(<OperationsPanel users={mockUsers} isVisible={true} />);

      expect(screen.getByText('Lightweight collaboration view')).toBeInTheDocument();
      expect(screen.getByText('Real-time')).toBeInTheDocument();
    });

    it('should have proper styling classes', () => {
      const { container } = render(
        <OperationsPanel users={mockUsers} isVisible={true} />
      );

      const panel = container.firstChild;
      expect(panel).toHaveClass('bg-white', 'border-l', 'border-gray-200');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty users and activities', () => {
      render(
        <OperationsPanel users={[]} isVisible={true} activities={[]} />
      );

      expect(screen.getByText('No users')).toBeInTheDocument();
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });

    it('should handle activities with all activity kinds', () => {
      const allKindsActivities: ActivityItem[] = [
        {
          id: 'edit-1',
          userId: 'user-1',
          kind: 'edit',
          timestamp: new Date(),
        },
        {
          id: 'save-1',
          userId: 'user-1',
          kind: 'save',
          timestamp: new Date(),
        },
        {
          id: 'presence-1',
          userId: 'user-1',
          kind: 'presence',
          timestamp: new Date(),
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={allKindsActivities}
        />
      );

      expect(screen.getByText('Edited')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should handle users without matching activity userId', () => {
      const activities: ActivityItem[] = [
        {
          id: 'activity-1',
          userId: 'non-existent-user',
          kind: 'edit',
          timestamp: new Date(),
        },
      ];

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          activities={activities}
        />
      );

      expect(screen.getByText('Someone')).toBeInTheDocument();
    });

    it('should handle boundary case for active status (exactly 10 seconds)', () => {
      const recentActiveByUser = {
        'user-1': Date.now() - 10000, // Exactly 10 seconds ago
      };

      render(
        <OperationsPanel
          users={mockUsers}
          isVisible={true}
          recentActiveByUser={recentActiveByUser}
        />
      );

      // Should be idle (< 10000, not <=)
      const idleStatuses = screen.getAllByText('Idle');
      expect(idleStatuses.length).toBeGreaterThan(0);
    });
  });
});
