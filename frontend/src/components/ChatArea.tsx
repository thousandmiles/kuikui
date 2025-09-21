import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/index';
import {
  validateMessage,
  sanitizeInput,
  VALIDATION_RULES,
} from '../utils/validation';
import {
  formatMessageTimestamp,
  formatTimestampWithTimezone,
} from '../utils/dateTime';

interface ChatAreaProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  onTypingChange: (isTyping: boolean) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  onSendMessage,
  onTypingChange,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messageError, setMessageError] = useState<string>('');
  const [isMessageValid, setIsMessageValid] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    const content = inputValue.trim();

    // Validate message content
    const validation = validateMessage(content);
    if (!validation.isValid) {
      setMessageError(validation.error ?? 'Invalid message');
      return;
    }

    // Sanitize message content
    const sanitizedContent = sanitizeInput(content);
    if (!sanitizedContent) {
      setMessageError('Message cannot be empty after cleanup');
      return;
    }

    onSendMessage(sanitizedContent);
    setInputValue('');
    setMessageError('');
    handleTypingStop();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Real-time validation
    const validation = validateMessage(value);
    setMessageError(validation.error ?? '');
    setIsMessageValid(validation.isValid);

    handleTypingStart();
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      onTypingChange(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  };

  const handleTypingStop = () => {
    if (isTyping) {
      setIsTyping(false);
      onTypingChange(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: Date) => {
    return formatMessageTimestamp(timestamp);
  };

  return (
    <div className='flex-1 flex flex-col bg-gray-50'>
      {/* Messages area */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3'>
        {messages.length === 0 ? (
          <div className='text-center text-gray-500 mt-8'>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div key={message.id} className='bg-white rounded-lg p-3 shadow-sm'>
              <div className='flex items-center justify-between mb-1'>
                <span className='font-medium text-gray-900 text-sm'>
                  {message.nickname}
                </span>
                <span
                  className='text-xs text-gray-500 cursor-help'
                  title={formatTimestampWithTimezone(message.timestamp)}
                >
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <p className='text-gray-700 text-sm leading-relaxed'>
                {message.content}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className='bg-white border-t border-gray-200 p-4'>
        <div className='flex space-x-2'>
          <input
            type='text'
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder='Type a message...'
            className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
              messageError
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            maxLength={VALIDATION_RULES.message.maxLength}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !isMessageValid}
            className='px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-lg transition duration-200'
          >
            Send
          </button>
        </div>

        <div className='flex justify-between items-center mt-2'>
          <div className='text-xs text-gray-500'>
            {inputValue.length}/{VALIDATION_RULES.message.maxLength} characters
          </div>
          {messageError && (
            <div className='text-xs text-red-600'>{messageError}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
