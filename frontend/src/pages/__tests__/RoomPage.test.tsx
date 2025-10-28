import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RoomPage from '../RoomPage';
import * as apiService from '../../services/apiService';
import * as socketService from '../../services/socketService';
import * as userPersistenceService from '../../services/userPersistenceService';

// Mock services
vi.mock('../../services/apiService', () => ({
  apiService: {
    checkRoomExists: vi.fn(),
  },
}));

vi.mock('../../services/socketService', () => ({
  socketService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    sendMessage: vi.fn(),
    sendTypingStatus: vi.fn(),
    isConnected: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('../../services/userPersistenceService', () => ({
  userPersistenceService: {
    getUserSession: vi.fn(),
    setUserSession: vi.fn(),
    clearUserSession: vi.fn(),
    markSessionAsEnded: vi.fn(),
  },
}));

// Mock components to simplify testing
vi.mock('../../components/UserList', () => ({
  default: ({ users }: any) => (
    <div data-testid='user-list'>
      {users.map((u: any) => (
        <div key={u.id}>{u.nickname}</div>
      ))}
    </div>
  ),
}));

vi.mock('../../components/ChatArea', () => ({
  default: ({ messages, onSendMessage }: any) => (
    <div data-testid='chat-area'>
      <div data-testid='messages'>
        {messages.map((m: any) => (
          <div key={m.id}>{m.content}</div>
        ))}
      </div>
      <button onClick={() => onSendMessage('test message')}>Send</button>
    </div>
  ),
}));

vi.mock('../../components/EditorWorkspace', () => ({
  default: ({ documentId }: any) => (
    <div data-testid='editor-workspace'>Editor: {documentId}</div>
  ),
}));

// Mock useParams and useNavigate
const mockNavigate = vi.fn();
const mockRoomId = '550e8400-e29b-41d4-a716-446655440000';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ roomId: mockRoomId }),
    useNavigate: () => mockNavigate,
  };
});

// Helper to render RoomPage
const renderRoomPage = () => {
  return render(
    <BrowserRouter>
      <RoomPage />
    </BrowserRouter>
  );
};

describe('RoomPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.apiService.checkRoomExists as any).mockResolvedValue(true);
    (socketService.socketService.isConnected as any).mockReturnValue(false);
    (
      userPersistenceService.userPersistenceService.getUserSession as any
    ).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should show verifying state on mount', () => {
      renderRoomPage();

      expect(screen.getByText('Verifying Room')).toBeInTheDocument();
      expect(screen.getByText(/Checking if room exists/i)).toBeInTheDocument();
    });

    it('should call checkRoomExists with correct roomId', async () => {
      renderRoomPage();

      await waitFor(() => {
        expect(apiService.apiService.checkRoomExists).toHaveBeenCalledWith(
          mockRoomId
        );
      });
    });
  });

  describe('Join Form', () => {
    it('should show nickname input after verification', async () => {
      renderRoomPage();

      await waitFor(() => {
        const input = screen.queryByLabelText(/Choose a nickname/i);
        expect(input).toBeInTheDocument();
      });
    });

    it('should show join button after verification', async () => {
      renderRoomPage();

      await waitFor(() => {
        const button = screen.queryByRole('button', { name: /Join Room/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('should show room ID in form', async () => {
      renderRoomPage();

      await waitFor(() => {
        expect(
          screen.queryByText(`Room ID: ${mockRoomId}`)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Service Integration', () => {
    it('should check for stored user session', async () => {
      renderRoomPage();

      await waitFor(() => {
        expect(
          userPersistenceService.userPersistenceService.getUserSession
        ).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error when room verification fails', async () => {
      (apiService.apiService.checkRoomExists as any).mockRejectedValue(
        new Error('Network error')
      );

      renderRoomPage();

      await waitFor(() => {
        expect(screen.queryByText('Failed to verify room')).toBeInTheDocument();
      });
    });

    it('should show error when room does not exist', async () => {
      (apiService.apiService.checkRoomExists as any).mockResolvedValue(false);

      renderRoomPage();

      await waitFor(() => {
        expect(screen.queryByText('Room does not exist')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should have back to home button', async () => {
      renderRoomPage();

      await waitFor(() => {
        expect(screen.queryByText('← Back to Home')).toBeInTheDocument();
      });
    });
  });
});
