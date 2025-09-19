import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socketService } from '../services/socketService';
import { apiService } from '../services/apiService';
import {
  User,
  ChatMessage,
  TypingStatus,
  JoinRoomResponse,
} from '../types/index';
import UserList from '../components/UserList';
import ChatArea from '../components/ChatArea';
import logger from '../utils/logger.js';

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    // Check if room exists
    const checkRoom = async () => {
      try {
        const exists = await apiService.checkRoomExists(roomId);
        if (!exists) {
          setError('Room does not exist');
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (err) {
        setError('Failed to verify room');
        logger.error('Failed to verify room', {
          error: err instanceof Error ? err.message : String(err),
          roomId,
        });
      }
    };

    void checkRoom();
  }, [roomId, navigate]);

  useEffect(() => {
    // Define event handlers
    const handleRoomJoined = (data: unknown) => {
      const joinResponse = data as JoinRoomResponse;
      if (joinResponse.success) {
        setUsers(joinResponse.users);
        setMessages(joinResponse.messages);
        setIsJoined(true);
        setError('');

        // Store current user (we'll get the user ID from the join response)
        currentUserRef.current =
          joinResponse.users.find((u: User) => u.nickname === nickname) ?? null;
      } else {
        setError(joinResponse.error ?? 'Failed to join room');
      }
      setIsConnecting(false);
    };

    const handleUserJoined = (user: unknown) => {
      const userData = user as User;
      setUsers(prev => {
        // Check if user already exists to prevent duplicates
        const userExists = prev.some(
          existingUser => existingUser.id === userData.id
        );
        if (userExists) {
          logger.warn('User already exists in the list, skipping duplicate', {
            nickname: userData.nickname,
            userId: userData.id,
            roomId,
          });
          return prev;
        }
        logger.component('RoomPage', 'Adding new user to list', {
          nickname: userData.nickname,
          userId: userData.id,
        });
        return [...prev, userData];
      });
    };

    const handleUserLeft = (userId: unknown) => {
      setUsers(prev => prev.filter(u => u.id !== String(userId)));
      setTypingUsers(prev => prev.filter(t => t.userId !== String(userId)));
    };

    const handleNewMessage = (message: unknown) => {
      const chatMessage = message as ChatMessage;
      setMessages(prev => [...prev, chatMessage]);
    };

    const handleUserTypingStatus = (status: unknown) => {
      const typingStatus = status as TypingStatus;
      setTypingUsers(prev => {
        const filtered = prev.filter(t => t.userId !== typingStatus.userId);
        return typingStatus.isTyping ? [...filtered, typingStatus] : filtered;
      });
    };

    const handleError = (data: unknown) => {
      const errorData = data as { message: string };
      setError(errorData.message);
      setIsConnecting(false);
    };

    // Register event listeners
    socketService.on('room-joined', handleRoomJoined);
    socketService.on('user-joined', handleUserJoined);
    socketService.on('user-left', handleUserLeft);
    socketService.on('new-message', handleNewMessage);
    socketService.on('user-typing-status', handleUserTypingStatus);
    socketService.on('error', handleError);

    return () => {
      // Cleanup listeners with actual function references
      socketService.off('room-joined', handleRoomJoined);
      socketService.off('user-joined', handleUserJoined);
      socketService.off('user-left', handleUserLeft);
      socketService.off('new-message', handleNewMessage);
      socketService.off('user-typing-status', handleUserTypingStatus);
      socketService.off('error', handleError);

      // Disconnect when leaving the component
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
    };
  }, [nickname, roomId]);

  const handleJoinRoom = async () => {
    if (!nickname.trim() || !roomId) {
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      if (!socketService.isConnected()) {
        await socketService.connect();
      }

      socketService.joinRoom(roomId, nickname.trim());
    } catch (err) {
      setError('Failed to connect to server');
      setIsConnecting(false);
      logger.error('Failed to connect to server', {
        error: err instanceof Error ? err.message : String(err),
        roomId,
        nickname: nickname.trim(),
      });
    }
  };

  const handleSendMessage = (content: string) => {
    try {
      socketService.sendMessage(content);
    } catch (err) {
      setError('Failed to send message');
      logger.error('Failed to send message', {
        error: err instanceof Error ? err.message : String(err),
        roomId,
        messageLength: content.length,
      });
    }
  };

  const handleTypingChange = (isTyping: boolean) => {
    try {
      socketService.sendTypingStatus(isTyping);
    } catch (err) {
      logger.error('Failed to send typing status', {
        error: err instanceof Error ? err.message : String(err),
        roomId,
        isTyping,
      });
    }
  };

  if (!roomId) {
    return <div>Invalid room</div>;
  }

  if (!isJoined) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center p-4'>
        <div className='max-w-md w-full bg-white rounded-lg shadow-lg p-8'>
          <div className='text-center mb-6'>
            <h1 className='text-2xl font-bold text-gray-900 mb-2'>Join Room</h1>
            <p className='text-gray-600'>Room ID: {roomId}</p>
          </div>

          <div className='space-y-4'>
            <div>
              <label
                htmlFor='nickname'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Choose a nickname:
              </label>
              <input
                type='text'
                id='nickname'
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && void handleJoinRoom()}
                placeholder='Enter your nickname'
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                maxLength={30}
                disabled={isConnecting}
              />
            </div>

            <button
              onClick={() => void handleJoinRoom()}
              disabled={!nickname.trim() || isConnecting}
              className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition duration-200'
            >
              {isConnecting ? 'Joining...' : 'Join Room'}
            </button>
          </div>

          {error && (
            <div className='mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded'>
              {error}
            </div>
          )}

          <div className='mt-6 text-center'>
            <button
              onClick={() => navigate('/')}
              className='text-blue-600 hover:text-blue-800 text-sm'
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='h-screen bg-gray-50 flex flex-col'>
      <header className='bg-white shadow-sm border-b px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-xl font-semibold text-gray-900'>kuikui</h1>
            <p className='text-sm text-gray-600'>Room: {roomId}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className='text-sm text-gray-600 hover:text-gray-800'
          >
            Leave Room
          </button>
        </div>
      </header>

      <div className='flex-1 flex overflow-hidden'>
        <UserList users={users} typingUsers={typingUsers} />
        <ChatArea
          messages={messages}
          onSendMessage={handleSendMessage}
          onTypingChange={handleTypingChange}
        />
      </div>

      {error && (
        <div className='absolute top-4 right-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded max-w-sm'>
          {error}
        </div>
      )}
    </div>
  );
};

export default RoomPage;
