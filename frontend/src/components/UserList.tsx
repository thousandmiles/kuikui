import { User, TypingStatus } from '../types/index';

interface UserListProps {
  users: User[];
  typingUsers: TypingStatus[];
  currentUserId?: string;
  ownerId?: string;
}

const UserList: React.FC<UserListProps> = ({
  users,
  typingUsers,
  currentUserId,
  ownerId,
}) => {
  // Sort users to put owner first, then others
  const sortedUsers = [...users].sort((a, b) => {
    if (a.id === ownerId) {
      return -1;
    }
    if (b.id === ownerId) {
      return 1;
    }
    return 0;
  });
  return (
    <div className='w-64 bg-white border-r border-gray-200 flex flex-col'>
      <div className='p-4 border-b border-gray-200'>
        <h2 className='text-lg font-semibold text-gray-900'>
          Users ({users.length})
        </h2>
      </div>

      <div className='flex-1 overflow-y-auto p-2'>
        {sortedUsers.map(user => {
          const isTyping = typingUsers.some(t => t.userId === user.id);
          const isCurrentUser = user.id === currentUserId;
          const isOwner = user.id === ownerId;

          return (
            <div
              key={user.id}
              className='flex items-center p-2 rounded-lg hover:bg-gray-50'
            >
              <div
                className={`w-3 h-3 rounded-full mr-3 ${
                  user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />

              <div className='flex-1 min-w-0'>
                <div className='flex items-center'>
                  <p
                    className={`text-sm font-medium truncate ${
                      isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                    }`}
                  >
                    {user.nickname}
                  </p>
                  {isOwner && (
                    <span className='ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium'>
                      owner
                    </span>
                  )}
                  {isCurrentUser && (
                    <span className='ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium'>
                      you
                    </span>
                  )}
                </div>
                {isTyping && (
                  <p className='text-xs text-gray-500 italic'>typing...</p>
                )}
              </div>
            </div>
          );
        })}

        {users.length === 0 && (
          <div className='text-center text-gray-500 text-sm mt-8'>
            No users in room
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
