import { useState } from 'react';
import { User, ChatMessage, TypingStatus } from '../types/index';
import ChatArea from './ChatArea';

interface CompactSidebarProps {
  // Existing UserList props
  users: User[];
  typingUsers: TypingStatus[];
  currentUserId?: string;
  ownerId?: string; // retained for compatibility, not shown in condensed editor view

  // Existing ChatArea props
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onTypingChange: (isTyping: boolean) => void;

  // New props for editor mode
  mode?: 'chat' | 'editor';
  isCollapsed?: boolean;
  unreadCount?: number;
}

type TabType = 'users' | 'chat';

const CompactSidebar: React.FC<CompactSidebarProps> = ({
  users,
  typingUsers,
  currentUserId,
  // ownerId omitted (not displayed in condensed list)
  messages,
  onSendMessage,
  onTypingChange,
  mode = 'chat',
  isCollapsed = false,
  unreadCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Generate user avatars with colors
  const getUserColor = (userId: string): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    const index = userId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const getUserInitials = (nickname: string): string => {
    return nickname
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Render compact user avatars (for editor mode)
  const renderCompactUsers = () => {
    const maxVisible = 5;
    const visibleUsers = users.slice(0, maxVisible);
    const remainingCount = users.length - maxVisible;

    return (
      <div className='flex items-center space-x-1 p-2'>
        {visibleUsers.map(user => (
          <div
            key={user.id}
            className={`relative w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getUserColor(user.id)}`}
            title={`${user.nickname} ${user.isOnline ? '(online)' : '(offline)'}`}
          >
            {getUserInitials(user.nickname)}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                user.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          </div>
        ))}
        {remainingCount > 0 && (
          <div className='w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium'>
            +{remainingCount}
          </div>
        )}
        {typingUsers.length > 0 && (
          <div className='ml-2 flex items-center space-x-1'>
            <div className='flex space-x-1'>
              <div className='w-1 h-1 bg-blue-500 rounded-full animate-bounce' />
              <div
                className='w-1 h-1 bg-blue-500 rounded-full animate-bounce'
                style={{ animationDelay: '0.1s' }}
              />
              <div
                className='w-1 h-1 bg-blue-500 rounded-full animate-bounce'
                style={{ animationDelay: '0.2s' }}
              />
            </div>
            <span className='text-xs text-gray-500'>
              {typingUsers.length === 1
                ? `${typingUsers[0].nickname} typing...`
                : `${typingUsers.length} typing...`}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Collapsed view for editor mode
  if (isCollapsed) {
    return (
      <div className='w-16 h-full bg-white border-r border-gray-200 flex flex-col'>
        <div className='p-2 border-b border-gray-200'>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 transition-colors ${
              activeTab === 'users'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
            title={`Users (${users.length})`}
          >
            <svg
              className='w-6 h-6'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
              />
            </svg>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`relative w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
              activeTab === 'chat'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
            title={`Chat ${unreadCount > 0 ? `(${unreadCount} new)` : ''}`}
          >
            <svg
              className='w-6 h-6'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
              />
            </svg>
            {unreadCount > 0 && (
              <div className='absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center'>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>
        </div>

        {activeTab === 'users' && (
          <div className='flex-1 overflow-hidden'>{renderCompactUsers()}</div>
        )}
      </div>
    );
  }

  // Full sidebar view
  const sidebarWidth = mode === 'editor' ? 'w-80' : 'w-64';

  return (
    <div
      className={`${sidebarWidth} h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden`}
    >
      {/* Tab Headers */}
      <div className='flex border-b border-gray-200 h-12'>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 h-full px-4 text-sm font-medium transition-colors relative flex items-center justify-center ${
            activeTab === 'users'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className='flex items-center justify-center space-x-2'>
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'
              />
            </svg>
            <span>Users ({users.length})</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 h-full px-4 text-sm font-medium transition-colors relative flex items-center justify-center ${
            activeTab === 'chat'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className='flex items-center justify-center space-x-2'>
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
              />
            </svg>
            <span>Chat</span>
            {unreadCount > 0 && (
              <div className='ml-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center'>
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div className='flex-1 overflow-hidden flex flex-col'>
        {activeTab === 'users' ? (
          <div className='h-full flex flex-col overflow-hidden'>
            <div className='p-3 border-b border-gray-200 bg-gray-50'>
              <div className='flex flex-wrap gap-2'>
                {users.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm ${
                      user.id === currentUserId
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${getUserColor(user.id)}`}
                    >
                      {getUserInitials(user.nickname)}
                    </div>
                    <span className='font-medium'>{user.nickname}</span>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                ))}
              </div>
              {typingUsers.length > 0 && (
                <div className='mt-2 text-xs text-gray-500 italic'>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].nickname} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </div>
              )}
            </div>
            {/* Scrollable detailed list removed to avoid redundancy */}
          </div>
        ) : (
          <div className='flex-1 flex flex-col min-h-0 h-full'>
            <ChatArea
              messages={messages}
              onSendMessage={onSendMessage}
              onTypingChange={onTypingChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CompactSidebar;
