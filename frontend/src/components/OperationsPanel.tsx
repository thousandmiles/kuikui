import { useMemo } from 'react';
import { User } from '../types/index';

type ActivityKind = 'edit' | 'presence' | 'save';
interface ActivityItem {
  id: string;
  userId?: string;
  kind: ActivityKind;
  timestamp: Date;
}

interface OperationsPanelProps {
  users: User[];
  isVisible: boolean;
  className?: string;
  activities?: ActivityItem[];
  recentActiveByUser?: Record<string, number>;
}

const OperationsPanel: React.FC<OperationsPanelProps> = ({
  users,
  isVisible,
  className = '',
  activities = [],
  recentActiveByUser = {},
}) => {
  const usersMap = useMemo(() => {
    const m: Record<string, User> = {};
    for (const u of users) {
      m[u.id] = u;
    }
    return m;
  }, [users]);

  if (!isVisible) {
    return null;
  }

  const isUserActive = (userId: string): boolean => {
    const last = recentActiveByUser[userId];
    if (!last) {
      return false;
    }
    return Date.now() - last < 10000;
  };

  const kindLabel = (k: ActivityKind) => {
    if (k === 'edit') {
      return 'Edited';
    }
    if (k === 'save') {
      return 'Saved';
    }
    return 'Active';
  };

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`flex flex-col h-full w-full min-w-[290px] bg-white border-l border-gray-200 ${className}`}
    >
      <div className='flex items-center justify-between h-12 px-4 border-b border-gray-200 bg-gray-50'>
        <div className='flex items-center space-x-3'>
          <h3 className='text-lg font-semibold text-gray-900'>Collaboration</h3>
        </div>
      </div>

      <div className='flex-1 overflow-auto p-4 space-y-6'>
        <div>
          <h4 className='text-sm font-medium text-gray-700 mb-2'>
            Collaborators
          </h4>
          <div className='space-y-2'>
            {users.length === 0 ? (
              <div className='text-sm text-gray-500'>No users</div>
            ) : (
              users.map(u => (
                <div key={u.id} className='flex items-center justify-between'>
                  <div className='flex items-center space-x-2'>
                    <div className='w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-700'>
                      {u.nickname.charAt(0).toUpperCase()}
                    </div>
                    <span className='text-sm text-gray-900'>{u.nickname}</span>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <span
                      className={`text-xs ${isUserActive(u.id) ? 'text-green-600' : 'text-gray-500'}`}
                    >
                      {isUserActive(u.id) ? 'Active' : 'Idle'}
                    </span>
                    <span
                      className='w-2 h-2 rounded-full'
                      style={{
                        backgroundColor: isUserActive(u.id)
                          ? '#22c55e'
                          : '#9ca3af',
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h4 className='text-sm font-medium text-gray-700 mb-2'>Recent</h4>
          {activities.length === 0 ? (
            <div className='text-sm text-gray-500'>No recent activity</div>
          ) : (
            <div className='space-y-2'>
              {activities.slice(0, 20).map(a => (
                <div
                  key={a.id}
                  className='flex items-center justify-between bg-gray-50 rounded p-2'
                >
                  <div className='flex items-center space-x-2'>
                    <div className='w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-700'>
                      {(a.userId ? usersMap[a.userId] : undefined)?.nickname
                        .charAt(0)
                        .toUpperCase() ?? '?'}
                    </div>
                    <div className='flex flex-col'>
                      <span className='text-sm text-gray-900'>
                        {(a.userId ? usersMap[a.userId] : undefined)
                          ?.nickname ?? 'Someone'}
                      </span>
                      <span className='text-xs text-gray-600'>
                        {kindLabel(a.kind)}
                      </span>
                    </div>
                  </div>
                  <span className='text-xs text-gray-500'>
                    {formatTime(a.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className='h-10 px-4 border-t border-gray-200 bg-gray-50 flex items-center'>
        <div className='flex items-center justify-between w-full text-xs text-gray-500'>
          <span>Lightweight collaboration view</span>
          <div className='flex items-center space-x-3'>
            <div className='flex items-center space-x-1'>
              <div className='w-2 h-2 bg-green-500 rounded-full' />
              <span>Real-time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsPanel;
