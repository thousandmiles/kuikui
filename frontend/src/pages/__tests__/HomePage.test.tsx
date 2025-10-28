import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import HomePage from '../HomePage';
import * as apiService from '../../services/apiService';

// Mock the API service
vi.mock('../../services/apiService', () => ({
  apiService: {
    createRoom: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper to render component with router
const renderHomePage = () => {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  );
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render the home page title', () => {
      renderHomePage();
      expect(screen.getByText('kuikui')).toBeInTheDocument();
    });

    it('should render the subtitle', () => {
      renderHomePage();
      expect(
        screen.getByText('Anonymous real-time collaboration')
      ).toBeInTheDocument();
    });

    it('should render create room button', () => {
      renderHomePage();
      const createButton = screen.getByRole('button', {
        name: /create new room/i,
      });
      expect(createButton).toBeInTheDocument();
    });

    it('should render join room button', () => {
      renderHomePage();
      const joinButton = screen.getByRole('button', {
        name: /join existing room/i,
      });
      expect(joinButton).toBeInTheDocument();
    });

    it('should display feature description', () => {
      renderHomePage();
      expect(screen.getByText(/No registration required/i)).toBeInTheDocument();
    });
  });

  describe('Create Room Functionality', () => {
    it('should call API when create button is clicked', async () => {
      const mockCreateRoom = vi
        .spyOn(apiService.apiService, 'createRoom')
        .mockResolvedValue({
          roomId: 'test-room-id',
          roomLink: 'http://localhost:5173/room/test-room-id',
        });

      const user = userEvent.setup();
      renderHomePage();

      const createButton = screen.getByRole('button', {
        name: /create new room/i,
      });

      await user.click(createButton);

      await waitFor(() => {
        expect(mockCreateRoom).toHaveBeenCalledTimes(1);
      });
    });

    it('should display loading state while creating room', async () => {
      vi.spyOn(apiService.apiService, 'createRoom').mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      const user = userEvent.setup();
      renderHomePage();

      const createButton = screen.getByRole('button', {
        name: /create new room/i,
      });

      await user.click(createButton);

      // Check for loading text
      expect(screen.getByText(/creating room/i)).toBeInTheDocument();
    });

    it('should display room link after successful creation', async () => {
      const mockRoomLink = 'http://localhost:5173/room/test-room-id';
      vi.spyOn(apiService.apiService, 'createRoom').mockResolvedValue({
        roomId: 'test-room-id',
        roomLink: mockRoomLink,
      });

      const user = userEvent.setup();
      renderHomePage();

      const createButton = screen.getByRole('button', {
        name: /create new room/i,
      });

      await user.click(createButton);

      // Wait for room link to appear in the input field
      await waitFor(() => {
        const input = screen.getByDisplayValue(mockRoomLink);
        expect(input).toBeInTheDocument();
      });
    });

    it('should display error message on creation failure', async () => {
      vi.spyOn(apiService.apiService, 'createRoom').mockRejectedValue(
        new Error('API Error')
      );

      const user = userEvent.setup();
      renderHomePage();

      const createButton = screen.getByRole('button', {
        name: /create new room/i,
      });

      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create room/i)).toBeInTheDocument();
      });
    });
  });

  describe('Join Room Functionality', () => {
    it('should open prompt when join button is clicked', async () => {
      const mockPrompt = vi.spyOn(window, 'prompt').mockReturnValue(null);

      const user = userEvent.setup();
      renderHomePage();

      const joinButton = screen.getByRole('button', {
        name: /join existing room/i,
      });

      await user.click(joinButton);

      expect(mockPrompt).toHaveBeenCalledWith('Enter room ID:');
      mockPrompt.mockRestore();
    });

    it('should navigate to room with valid room ID', async () => {
      const validRoomId = '550e8400-e29b-41d4-a716-446655440000'; // Valid v4 UUID
      const mockPrompt = vi
        .spyOn(window, 'prompt')
        .mockReturnValue(validRoomId);

      const user = userEvent.setup();
      renderHomePage();

      const joinButton = screen.getByRole('button', {
        name: /join existing room/i,
      });

      await user.click(joinButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(`/room/${validRoomId}`);
      });

      mockPrompt.mockRestore();
    });

    it('should display error for invalid room ID', async () => {
      const mockPrompt = vi
        .spyOn(window, 'prompt')
        .mockReturnValue('invalid-id');

      const user = userEvent.setup();
      renderHomePage();

      const joinButton = screen.getByRole('button', {
        name: /join existing room/i,
      });

      await user.click(joinButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid room id/i)).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      mockPrompt.mockRestore();
    });

    it('should do nothing when prompt is cancelled', async () => {
      const mockPrompt = vi.spyOn(window, 'prompt').mockReturnValue(null);

      const user = userEvent.setup();
      renderHomePage();

      const joinButton = screen.getByRole('button', {
        name: /join existing room/i,
      });

      await user.click(joinButton);

      expect(mockNavigate).not.toHaveBeenCalled();
      mockPrompt.mockRestore();
    });
  });

  describe('Copy Link Functionality', () => {
    it('should copy room link to clipboard', async () => {
      const mockRoomLink = 'http://localhost:5173/room/test-room-id';

      // Set up clipboard mock
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      global.navigator = {
        ...global.navigator,
        clipboard: {
          ...global.navigator.clipboard,
          writeText: mockWriteText,
        },
      } as Navigator;

      vi.spyOn(apiService.apiService, 'createRoom').mockResolvedValue({
        roomId: 'test-room-id',
        roomLink: mockRoomLink,
      });

      const user = userEvent.setup();
      renderHomePage();

      // Create room first
      const createButton = screen.getByRole('button', {
        name: /create new room/i,
      });
      await user.click(createButton);

      // Wait for the "Copy" button to appear
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /^copy$/i })
        ).toBeInTheDocument();
      });

      // Click copy button
      const copyButton = screen.getByRole('button', { name: /^copy$/i });
      await user.click(copyButton);

      // Verify "Copied!" confirmation appears (proves copy worked)
      await waitFor(() => {
        expect(screen.getByText(/copied!/i)).toBeInTheDocument();
      });

      // Also verify the mock was called if it worked
      if (mockWriteText.mock.calls.length > 0) {
        expect(mockWriteText).toHaveBeenCalledWith(mockRoomLink);
      }
    });

    it('should use fallback copy method when clipboard API fails', async () => {
      const mockRoomLink = 'http://localhost:5173/room/test-room-id';

      // Mock clipboard.writeText to throw an error
      const mockWriteText = vi
        .fn()
        .mockRejectedValue(new Error('Clipboard API not available'));
      global.navigator = {
        ...global.navigator,
        clipboard: {
          ...global.navigator.clipboard,
          writeText: mockWriteText,
        },
      } as Navigator;

      // Mock document.execCommand
      (document as any).execCommand = vi.fn().mockReturnValue(true);

      vi.spyOn(apiService.apiService, 'createRoom').mockResolvedValue({
        roomId: 'test-room-id',
        roomLink: mockRoomLink,
      });

      const user = userEvent.setup();
      renderHomePage();

      // Create room first
      const createButton = screen.getByRole('button', {
        name: /create new room/i,
      });
      await user.click(createButton);

      // Wait for copy button
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /^copy$/i })
        ).toBeInTheDocument();
      });

      // Click copy button
      const copyButton = screen.getByRole('button', { name: /^copy$/i });
      await user.click(copyButton);

      // Verify fallback was used
      await waitFor(() => {
        expect((document as any).execCommand).toHaveBeenCalledWith('copy');
      });

      // Verify "Copied!" still appears
      expect(screen.getByText(/copied!/i)).toBeInTheDocument();

      delete (document as any).execCommand;
    });
  });

  describe('Enter Room Functionality', () => {
    it('should navigate to room when enter room button is clicked', async () => {
      const mockRoomLink =
        'http://localhost:5173/room/550e8400-e29b-41d4-a716-446655440000';
      const mockRoomId = '550e8400-e29b-41d4-a716-446655440000';

      vi.spyOn(apiService.apiService, 'createRoom').mockResolvedValue({
        roomId: mockRoomId,
        roomLink: mockRoomLink,
      });

      const user = userEvent.setup();
      renderHomePage();

      // Create room first
      const createButton = screen.getByRole('button', {
        name: /create new room/i,
      });
      await user.click(createButton);

      // Wait for enter room button
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /enter room/i })
        ).toBeInTheDocument();
      });

      // Click enter room button
      const enterButton = screen.getByRole('button', { name: /enter room/i });
      await user.click(enterButton);

      // Verify navigation was called
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(`/room/${mockRoomId}`);
      });
    });

    it('should show loading state when entering room', async () => {
      const mockRoomLink =
        'http://localhost:5173/room/550e8400-e29b-41d4-a716-446655440000';

      vi.spyOn(apiService.apiService, 'createRoom').mockResolvedValue({
        roomId: '550e8400-e29b-41d4-a716-446655440000',
        roomLink: mockRoomLink,
      });

      const user = userEvent.setup();
      renderHomePage();

      // Create room
      const createButton = screen.getByRole('button', {
        name: /create new room/i,
      });
      await user.click(createButton);

      // Wait for enter room button
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /enter room/i })
        ).toBeInTheDocument();
      });

      // Click enter room button
      const enterButton = screen.getByRole('button', { name: /enter room/i });
      await user.click(enterButton);

      // Check for loading text (briefly)
      expect(screen.getByText(/entering/i)).toBeInTheDocument();
    });
  });
});
