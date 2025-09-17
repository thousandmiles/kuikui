import React from 'react';
import { User, TypingStatus } from '../types';

interface UserListProps {
    users: User[];
    typingUsers: TypingStatus[];
}

const UserList: React.FC<UserListProps> = ({ users, typingUsers }) => {
    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                    Users ({users.length})
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {users.map(user => {
                    const isTyping = typingUsers.some(t => t.userId === user.id);

                    return (
                        <div
                            key={user.id}
                            className="flex items-center p-2 rounded-lg hover:bg-gray-50"
                        >
                            <div className={`w-3 h-3 rounded-full mr-3 ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                }`} />

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user.nickname}
                                </p>
                                {isTyping && (
                                    <p className="text-xs text-gray-500 italic">typing...</p>
                                )}
                            </div>
                        </div>
                    );
                })}

                {users.length === 0 && (
                    <div className="text-center text-gray-500 text-sm mt-8">
                        No users in room
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserList;