import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socketService } from '../services/socketService';
import { apiService } from '../services/apiService';
import { userPersistenceService } from '../services/userPersistenceService';
import {
  User,
  ChatMessage,
  TypingStatus,
  JoinRoomResponse,
} from '../types/index';
import UserList from '../components/UserList';
import ChatArea from '../components/ChatArea';
import logger from '../utils/logger.js';
import {
  validateNickname,
  validateRoomId,
  sanitizeInput,
  VALIDATION_RULES,
} from '../utils/validation';

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
  const [copied, setCopied] = useState(false);
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
  const [nicknameError, setNicknameError] = useState<string>('');
  const [isNicknameValid, setIsNicknameValid] = useState<boolean>(false);
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    if (!roomId) {
      navigate('/');
      return;
    }

    // Validate room ID format
    const roomIdValidation = validateRoomId(roomId);
    if (!roomIdValidation.isValid) {
      setError(roomIdValidation.error ?? 'Invalid room ID');
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    // Check if room exists and handle auto-rejoin
    const checkRoomAndAutoRejoin = async () => {
      try {
        const exists = await apiService.checkRoomExists(roomId);
        if (!exists) {
          setError('Room does not exist');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Check if user has a valid session for this room
        const storedSession = userPersistenceService.getUserSession(roomId);
        if (storedSession) {
          // Auto-rejoin with stored session
          setNickname(storedSession.nickname);
          setIsConnecting(true);

          try {
            if (!socketService.isConnected()) {
              await socketService.connect();
            }

            socketService.joinRoom(
              roomId,
              storedSession.nickname,
              storedSession.userId
            );
          } catch (err) {
            setError('Failed to reconnect to room');
            setIsConnecting(false);
            logger.error('Failed to auto-rejoin room', {
              error: err instanceof Error ? err.message : String(err),
              roomId,
              userId: storedSession.userId,
              nickname: storedSession.nickname,
            });
          }
        }
      } catch (err) {
        setError('Failed to verify room');
        logger.error('Failed to verify room', {
          error: err instanceof Error ? err.message : String(err),
          roomId,
        });
      }
    };

    void checkRoomAndAutoRejoin();
  }, [roomId, navigate]);

  const handleCopyRoomId = async () => {
    if (!roomId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      logger.error('Failed to copy room ID to clipboard', {
        error: err instanceof Error ? err.message : String(err),
        roomId,
      });
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    // Define event handlers
    const handleRoomJoined = (data: unknown) => {
      const joinResponse = data as JoinRoomResponse;
      if (joinResponse.success) {
        setUsers(joinResponse.users);
        setMessages(joinResponse.messages);
        setIsJoined(true);
        setError('');

        // Store owner information
        setOwnerId(joinResponse.ownerId);

        // Store the complete user session for persistence across sessions
        if (joinResponse.userId && roomId) {
          userPersistenceService.setUserSession(
            joinResponse.userId,
            nickname,
            roomId
          );
        }

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

  // Handle browser close/refresh cleanup
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Don't clear session data on refresh/close - we want to preserve it for auto-rejoin
      // Just ensure clean disconnect
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden (tab switched, minimized, etc.)
        // Update last activity timestamp to keep session fresh
        if (isJoined) {
          userPersistenceService.updateLastActivity();
        }
      }
    };

    // Only add the beforeunload listener if user is actually in a room
    if (isJoined) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isJoined, messages.length]);

  // Nickname validation
  const validateNicknameInput = useCallback((value: string) => {
    const validation = validateNickname(value);
    setNicknameError(validation.error ?? '');
    setIsNicknameValid(validation.isValid);
  }, []);

  // Handle nickname change with validation
  const handleNicknameChange = (value: string) => {
    setNickname(value);
    // Immediate validation feedback
    validateNicknameInput(value);
  };

  const handleJoinRoom = async () => {
    if (!roomId || !nickname.trim()) {
      return;
    }

    // Final validation before joining
    const validation = validateNickname(nickname);
    if (!validation.isValid) {
      setNicknameError(validation.error ?? 'Invalid nickname');
      return;
    }

    const sanitizedNickname = sanitizeInput(nickname);
    if (!sanitizedNickname) {
      setNicknameError('Nickname cannot be empty after cleanup');
      return;
    }

    setIsConnecting(true);
    setError('');
    setNicknameError('');

    try {
      if (!socketService.isConnected()) {
        await socketService.connect();
      }

      // This is for new users or users with expired sessions
      // No stored userId should be used here - let backend generate a new one
      socketService.joinRoom(
        roomId,
        sanitizedNickname,
        undefined // Always undefined for manual joins
      );
    } catch (err) {
      setError('Failed to connect to server');
      setIsConnecting(false);
      logger.error('Failed to connect to server', {
        error: err instanceof Error ? err.message : String(err),
        roomId,
        nickname: sanitizedNickname,
      });
    }
  };

  const handleSendMessage = (content: string) => {
    try {
      socketService.sendMessage(content);
      // Update activity timestamp to keep session fresh
      userPersistenceService.updateLastActivity();
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

  const handleLeaveRoom = () => {
    // Mark session as intentionally ended before clearing
    userPersistenceService.markSessionAsEnded();

    // Clear the stored session when explicitly leaving (room-specific)
    if (roomId) {
      userPersistenceService.clearUserSession(roomId);
    }

    navigate('/');
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
                onChange={e => handleNicknameChange(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && void handleJoinRoom()}
                placeholder='Enter your nickname'
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  nicknameError
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                maxLength={VALIDATION_RULES.nickname.maxLength}
                disabled={isConnecting}
              />
              {nicknameError && (
                <p className='mt-1 text-sm text-red-600'>{nicknameError}</p>
              )}
              <p className='mt-1 text-xs text-gray-500'>
                {nickname.length}/{VALIDATION_RULES.nickname.maxLength}{' '}
                characters
              </p>
            </div>

            <button
              onClick={() => void handleJoinRoom()}
              disabled={!nickname.trim() || !isNicknameValid || isConnecting}
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
              onClick={handleLeaveRoom}
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
            <div className='flex items-center group'>
              <p className='text-sm text-gray-600'>Room: {roomId}</p>
              <button
                onClick={() => void handleCopyRoomId()}
                className='ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
                title={copied ? 'Copied!' : 'Copy room ID'}
              >
                {copied ? (
                  <svg
                    className='w-4 h-4 text-green-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M5 13l4 4L19 7'
                    />
                  </svg>
                ) : (
                  <svg
                    className='w-4 h-4 text-gray-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            onClick={handleLeaveRoom}
            className='px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-red-500'
          >
            Leave Room
          </button>
        </div>
      </header>

      <div className='flex-1 flex overflow-hidden'>
        <UserList
          users={users}
          typingUsers={typingUsers}
          currentUserId={currentUserRef.current?.id}
          ownerId={ownerId}
        />
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
