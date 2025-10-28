/**
 * @fileoverview Test suite for App component
 * 
 * Tests the main application routing:
 * - Route definitions and navigation
 * - HomePage and RoomPage rendering
 * 
 * @see {@link App} for implementation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock the page components to avoid complex dependencies
vi.mock('../pages/HomePage', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('../pages/RoomPage', () => ({
  default: () => <div data-testid="room-page">Room Page</div>,
}));

describe('App', () => {
  it('should render HomePage at root path', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    expect(screen.queryByTestId('room-page')).not.toBeInTheDocument();
  });

  it('should render RoomPage at /room/:roomId path', () => {
    render(
      <MemoryRouter initialEntries={['/room/test-room-123']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('room-page')).toBeInTheDocument();
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument();
  });

  it('should handle different routes independently', () => {
    // Test home route
    const { unmount: unmount1 } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
    unmount1();

    // Test room route
    render(
      <MemoryRouter initialEntries={['/room/abc-123']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByTestId('room-page')).toBeInTheDocument();
  });

  it('should accept different room IDs in the route', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/room/room-id-1']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('room-page')).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/room/different-room-id']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('room-page')).toBeInTheDocument();
  });
});
