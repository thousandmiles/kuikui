import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';

const HomePage: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [roomLink, setRoomLink] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');

    try {
      const response = await apiService.createRoom();
      setRoomLink(response.roomLink);
    } catch (err) {
      setError('Failed to create room. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    const roomId = prompt('Enter room ID:');
    if (roomId?.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      alert('Room link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4'>
      <div className='max-w-md w-full bg-white rounded-lg shadow-lg p-8'>
        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>kuikui</h1>
          <p className='text-gray-600'>Anonymous real-time collaboration</p>
        </div>

        <div className='space-y-4'>
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            className='w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-lg transition duration-200'
          >
            {isCreating ? 'Creating Room...' : 'Create New Room'}
          </button>

          <button
            onClick={handleJoinRoom}
            className='w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200'
          >
            Join Existing Room
          </button>
        </div>

        {error && (
          <div className='mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded'>
            {error}
          </div>
        )}

        {roomLink && (
          <div className='mt-6 p-4 bg-green-50 border border-green-200 rounded-lg'>
            <h3 className='text-lg font-semibold text-green-800 mb-2'>
              Room Created!
            </h3>
            <p className='text-sm text-green-700 mb-3'>
              Share this link with others:
            </p>
            <div className='flex gap-2'>
              <input
                type='text'
                value={roomLink}
                readOnly
                className='flex-1 px-3 py-2 border border-green-300 rounded text-sm'
              />
              <button
                onClick={copyToClipboard}
                className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition duration-200'
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => {
                const roomId = roomLink.split('/').pop();
                if (roomId) {
                  navigate(`/room/${roomId}`);
                }
              }}
              className='w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition duration-200'
            >
              Enter Room
            </button>
          </div>
        )}

        <div className='mt-8 text-center text-sm text-gray-500'>
          <p>No registration required • Rooms expire after 24h of inactivity</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
