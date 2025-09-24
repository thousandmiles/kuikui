import { useState } from 'react';
import { User } from '../types/index';
import SimpleSelect from './SimpleSelect';

interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'format' | 'move';
  user: User;
  timestamp: Date;
  description: string;
  position?: { from: number; to: number };
  content?: string;
  formatting?: string[];
}

interface OperationsPanelProps {
  operations: Operation[];
  users: User[];
  isVisible: boolean;
  onToggleVisibility: () => void;
  onRevertOperation?: (operationId: string) => void;
  onJumpToOperation?: (operationId: string) => void;
  className?: string;
}

const OperationsPanel: React.FC<OperationsPanelProps> = ({
  operations,
  users,
  isVisible,
  onToggleVisibility,
  onRevertOperation,
  onJumpToOperation,
  className = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'mine' | 'others'>('all');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | 'all'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Get user color for consistent UI
  const getUserColor = (userId: string): string => {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#8B5CF6', // purple
      '#F59E0B', // yellow
      '#EF4444', // red
      '#06B6D4', // cyan
      '#84CC16', // lime
      '#F97316', // orange
    ];
    const index = userId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Get operation icon
  const getOperationIcon = (type: Operation['type']) => {
    switch (type) {
      case 'insert':
        return (
          <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z'
              clipRule='evenodd'
            />
          </svg>
        );
      case 'delete':
        return (
          <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z'
              clipRule='evenodd'
            />
          </svg>
        );
      case 'format':
        return (
          <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
            <path d='M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z' />
          </svg>
        );
      case 'move':
        return (
          <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
            <path d='M10 6L9 7l5 5-5 5 1 1 6-6-6-6zM5 6L4 7l5 5-5 5 1 1 6-6L5 6z' />
          </svg>
        );
      default:
        return null;
    }
  };

  // Format timestamp
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

  // Filter operations based on current filters
  const filteredOperations = operations.filter(operation => {
    // Filter by user
    if (filter === 'mine' && operation.user.id !== selectedUser) {
      return false;
    }
    if (filter === 'others' && operation.user.id === selectedUser) {
      return false;
    }
    if (selectedUser && operation.user.id !== selectedUser) {
      return false;
    }

    // Filter by time range
    if (timeRange !== 'all') {
      const now = new Date();
      const diffMs = now.getTime() - operation.timestamp.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      switch (timeRange) {
        case '1h':
          if (diffHours > 1) {
            return false;
          }
          break;
        case '24h':
          if (diffHours > 24) {
            return false;
          }
          break;
        case '7d':
          if (diffHours > 24 * 7) {
            return false;
          }
          break;
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        operation.description.toLowerCase().includes(query) ||
        operation.user.nickname.toLowerCase().includes(query) ||
        operation.content?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Group operations by day
  const groupedOperations = filteredOperations.reduce<
    Record<string, Operation[]>
  >((groups, operation) => {
    const dateKey = operation.timestamp.toDateString();
    groups[dateKey] = groups[dateKey] ?? [];
    groups[dateKey].push(operation);
    return groups;
  }, {});

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`flex flex-col h-full w-full min-w-[290px] bg-white border-l border-gray-200 ${className}`}
    >
      {/* Header */}
      <div className='flex items-center justify-between h-12 px-4 border-b border-gray-200 bg-gray-50'>
        <div className='flex items-center space-x-3'>
          <h3 className='text-lg font-semibold text-gray-900'>Operations</h3>
          <span className='px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full'>
            {filteredOperations.length}
          </span>
        </div>
        <button
          onClick={onToggleVisibility}
          className='p-1 text-gray-400 hover:text-gray-600 rounded'
          title='Close panel'
        >
          <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
              clipRule='evenodd'
            />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className='p-4 pb-5 border-b border-gray-200 space-y-3 relative z-10'>
        {/* Search */}
        <div className='relative'>
          <input
            type='text'
            placeholder='Search operations...'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />
          <svg
            className='absolute left-2.5 top-2.5 w-4 h-4 text-gray-400'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z'
              clipRule='evenodd'
            />
          </svg>
        </div>

        {/* Filter toggles */}
        <div className='flex items-center flex-wrap gap-x-4 gap-y-3 relative z-20'>
          <div className='flex items-center space-x-2'>
            <span className='text-sm font-medium text-gray-700'>Filter:</span>
            <SimpleSelect
              aria-label='Filter operations'
              value={filter}
              options={[
                { value: 'all', label: 'All users' },
                { value: 'mine', label: 'My changes' },
                { value: 'others', label: 'Others changes' },
              ]}
              onChange={val => setFilter(val)}
              className='min-w-[7rem]'
            />
          </div>

          <div className='flex items-center space-x-2'>
            <span className='text-sm font-medium text-gray-700'>Time:</span>
            <SimpleSelect
              aria-label='Time range'
              value={timeRange}
              options={[
                { value: 'all', label: 'All time' },
                { value: '1h', label: 'Last hour' },
                { value: '24h', label: 'Last 24h' },
                { value: '7d', label: 'Last 7 days' },
              ]}
              onChange={val => setTimeRange(val)}
              className='min-w-[7rem]'
            />
          </div>
        </div>

        {/* User filter */}
        {users.length > 1 && (
          <div className='flex items-center space-x-2'>
            <span className='text-sm font-medium text-gray-700'>User:</span>
            <SimpleSelect
              aria-label='User filter'
              value={selectedUser}
              options={[
                { value: '' as const, label: 'All users' },
                ...users.map(
                  u => ({ value: u.id, label: u.nickname }) as const
                ),
              ]}
              onChange={val => setSelectedUser(val)}
              className='min-w-[7rem]'
            />
          </div>
        )}
      </div>

      {/* Operations list */}
      <div className='flex-1 overflow-auto'>
        {Object.keys(groupedOperations).length === 0 ? (
          <div className='flex flex-col items-center justify-center h-32 text-gray-500'>
            <svg
              className='w-8 h-8 mb-2'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path d='M9 2a1 1 0 000 2h2a1 1 0 100-2H9z' />
              <path
                fillRule='evenodd'
                d='M4 5a2 2 0 012-2v1a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2V3a2 2 0 012-2 2 2 0 012 2v8a4 4 0 01-4 4H6a4 4 0 01-4-4V5z'
                clipRule='evenodd'
              />
            </svg>
            <p className='text-sm'>No operations found</p>
          </div>
        ) : (
          <div className='space-y-4 p-4'>
            {Object.entries(groupedOperations)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([dateKey, dayOperations]) => (
                <div key={dateKey}>
                  <h4 className='text-sm font-medium text-gray-900 mb-3 sticky top-0 bg-white'>
                    {new Date(dateKey).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </h4>
                  <div className='space-y-2'>
                    {dayOperations
                      .sort(
                        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
                      )
                      .map(operation => (
                        <button
                          key={operation.id}
                          type='button'
                          className='flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group w-full text-left'
                          onClick={() => onJumpToOperation?.(operation.id)}
                        >
                          {/* User avatar */}
                          <div
                            className='w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0'
                            style={{
                              backgroundColor: getUserColor(operation.user.id),
                            }}
                          >
                            {operation.user.nickname.charAt(0).toUpperCase()}
                          </div>

                          {/* Operation details */}
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center space-x-2 mb-1'>
                              <span
                                className='inline-flex items-center space-x-1 text-gray-600'
                                style={{
                                  color: getUserColor(operation.user.id),
                                }}
                              >
                                {getOperationIcon(operation.type)}
                                <span className='text-sm font-medium'>
                                  {operation.user.nickname}
                                </span>
                              </span>
                              <span className='text-xs text-gray-500'>
                                {formatTime(operation.timestamp)}
                              </span>
                            </div>

                            <p className='text-sm text-gray-900 mb-1'>
                              {operation.description}
                            </p>

                            {operation.content && (
                              <p className='text-xs text-gray-600 bg-white px-2 py-1 rounded border font-mono'>
                                &quot;{operation.content}&quot;
                              </p>
                            )}

                            {operation.formatting &&
                              operation.formatting.length > 0 && (
                                <div className='flex items-center space-x-1 mt-1'>
                                  {operation.formatting.map(format => (
                                    <span
                                      key={format}
                                      className='inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded'
                                    >
                                      {format}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </div>

                          {/* Action buttons */}
                          <div className='flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                            {onJumpToOperation && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  onJumpToOperation(operation.id);
                                }}
                                className='p-1 text-gray-400 hover:text-blue-600 rounded'
                                title='Jump to position'
                              >
                                <svg
                                  className='w-4 h-4'
                                  fill='currentColor'
                                  viewBox='0 0 20 20'
                                >
                                  <path
                                    fillRule='evenodd'
                                    d='M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z'
                                    clipRule='evenodd'
                                  />
                                </svg>
                              </button>
                            )}

                            {onRevertOperation && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  onRevertOperation(operation.id);
                                }}
                                className='p-1 text-gray-400 hover:text-red-600 rounded'
                                title='Revert operation'
                              >
                                <svg
                                  className='w-4 h-4'
                                  fill='currentColor'
                                  viewBox='0 0 20 20'
                                >
                                  <path
                                    fillRule='evenodd'
                                    d='M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z'
                                    clipRule='evenodd'
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='p-3 border-t border-gray-200 bg-gray-50'>
        <div className='flex items-center justify-between text-xs text-gray-500'>
          <span>
            Showing {filteredOperations.length} of {operations.length}{' '}
            operations
          </span>
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
