# kuikui AI Coding Agent Instructions

## Project Overview

Anonymous real-time collaboration tool built with Node.js/Express backend and
React/TypeScript frontend. Core features: instant WebSocket-based room creation,
real-time chat, and collaborative rich-text editing using ProseMirror + Y.js
CRDT.

## Architecture

### Monorepo Structure

- **Workspace root**: npm workspaces with `backend/` and `frontend/` packages
- **Backend** (port 3001): Express + Socket.IO server, in-memory room state
  management
- **Frontend** (port 5173): Vite + React + React Router, ProseMirror editor
  integration

### Critical Data Flow

1. **Room lifecycle**: REST API creates room → Socket.IO manages users/messages
   → In-memory `RoomService` (no persistence)
2. **Real-time sync**: Socket.IO events bridge server ↔ clients for
   chat/presence
3. **Document CRDT**: Y.js Doc synced via custom `SocketProvider` (frontend) ↔
   Socket.IO broadcast (backend)

### Key Integration Points

- `backend/src/services/socketService.ts`: Socket.IO event handlers (join-room,
  send-message, editor:\*)
- `frontend/src/services/socketService.ts`: Client-side Socket.IO wrapper with
  lifecycle events
- `frontend/src/services/socketProvider.ts`: Y.js awareness + document sync over
  Socket.IO
- `frontend/src/components/RichTextEditor.tsx`: ProseMirror view integrating
  Y.js plugins

## Environment Configuration

### Setup Workflow (CRITICAL)

Environment variables cascade from root → backend/frontend subdirectories:

```bash
npm run env:setup    # Distributes root .env to backend/.env and frontend/.env
npm run env:validate # Checks all required vars exist
npm run dev          # Runs port:cleanup → env:setup → env:validate → concurrent dev servers
```

### Key Environment Variables

- **Backend** reads from `backend/.env`: `BACKEND_PORT`, `CORS_ORIGIN`,
  `ROOM_CAPACITY`, `ROOM_EXPIRY_HOURS`
- **Frontend** reads from Vite (`VITE_*` prefix): `VITE_API_BASE_URL`,
  `VITE_WEBSOCKET_URL`
- **Scripts**: `scripts/env-setup.js` auto-generates workspace `.env` files;
  `scripts/port-cleanup.js` kills conflicting processes

## Testing & Quality

### Test Commands (per workspace)

```bash
npm test              # Run all tests (backend + frontend)
npm run test:watch    # Watch mode (backend only by default)
npm run test:coverage # Generate coverage reports in coverage/
npm run test:ui       # Launch Vitest UI (frontend)
```

### Testing Patterns

- **Backend**: Vitest with Node environment, tests in
  `src/**/__tests__/*.test.ts`
- **Frontend**: Vitest + jsdom + React Testing Library, same pattern
- **Socket.IO helpers**: `backend/test/helpers/socketTestHelpers.ts` for
  server/client test fixtures
- **Mocking ProseMirror/Y.js**: See
  `frontend/src/components/__tests__/RichTextEditor.test.tsx` for heavy mocking
  patterns (these libs are integration-test territory)

### Coverage Thresholds

- Backend: lines 70%, functions 60%, branches 75%
- Frontend: lines 23%, functions 60%, branches 70% (lower due to UI complexity)
- Excluded: `src/index.ts`, `socketService.ts` (integration-tested), config
  files, test dirs

## Code Conventions

### TypeScript Strictness

- Strict mode enabled in all `tsconfig.json`
- Use path aliases: `@/` → `src/`, `@test/` → `test/`
- Shared types in `backend/src/types/index.ts` (copied to frontend when needed)

### Shared Type Definitions

Key interfaces in `src/types/index.ts`:

- `User`, `Room`, `ChatMessage`: Core domain models
- `JoinRoomRequest/Response`: Socket.IO join-room contract
- `SocketError` + `SocketErrorCode`: Standardized error handling across
  client/server

### Logging Strategy

- **Backend**: Winston logger in `utils/logger.ts` with custom methods
  (`logger.room()`, `logger.socket()`)
- **Frontend**: `loglevel` wrapper in `utils/logger.js`
- **Pattern**: Structured logging with context objects (e.g.,
  `logger.info('message', { roomId, userId })`)

### Error Handling

- Socket.IO errors use `utils/socketErrors.ts` helpers: `createSocketError()` →
  `emitSocketError(socket, error)`
- Frontend catches socket errors via `socketService.on('error', handler)`
- All errors include `SocketErrorCode` enum + recoverable flag for UI retry
  logic

## Development Workflow

### Starting Development

```bash
npm run dev  # Auto-cleanup ports → validate env → start backend:3001 + frontend:5173
```

### Build & Type Check

```bash
npm run build       # TypeScript compile both workspaces
npm run type-check  # tsc --noEmit for both workspaces
npm run lint        # ESLint all source files
npm run format      # Prettier format (auto-fix)
```

### Formatting Rules

- Prettier config: `.prettierrc.js` (2-space indent, single quotes, 80 char
  width)
- ESLint extends `@typescript-eslint/recommended` + `prettier` (no conflicts)
- Commit code fully formatted and linted

## Common Gotchas

1. **Room ownership**: First user to join becomes `ownerId` (see
   `RoomService.addUserToRoom`)
2. **Nickname conflicts**: Server enforces uniqueness case-insensitively per
   room
3. **User reconnection**: If `userId` provided in join-room, user rejoins with
   server-saved nickname (no client-side rename)
4. **Rate limiting**: Socket.IO events have per-user rate limits (see
   `validation.ts` `RateLimiter`)
5. **CORS**: Backend CORS origin must match frontend URL (check `CORS_ORIGIN`
   env var)
6. **Y.js batching**: `SocketProvider` batches doc/awareness updates (250ms doc,
   400ms awareness) to reduce socket spam
7. **Testing ProseMirror**: Heavy mocking required; prefer integration tests for
   editor features

## File Organization

### Backend

- `src/index.ts`: Express + Socket.IO server setup
- `src/routes/`: REST API endpoints (`/api/create-room`, `/api/room/:id/exists`)
- `src/services/roomService.ts`: In-memory room/user state manager (singleton)
- `src/services/socketService.ts`: Socket.IO event handlers setup
- `src/utils/validation.ts`: Input validators + rate limiter

### Frontend

- `src/main.tsx`: React app entry (wraps with BrowserRouter)
- `src/App.tsx`: Route definitions (HomePage, RoomPage)
- `src/pages/RoomPage.tsx`: Main collaboration UI (chat + editor + user list)
- `src/components/RichTextEditor.tsx`: ProseMirror + Y.js integration
- `src/services/socketService.ts`: Client socket wrapper (singleton)
- `src/services/socketProvider.ts`: Y.js ↔ Socket.IO bridge

## When Making Changes

### Adding Socket Events

1. Define event name + payload types in `backend/src/types/index.ts`
2. Add handler in `backend/src/services/socketService.ts`
3. Add emitter/listener in `frontend/src/services/socketService.ts`
4. Update RoomPage or component to use the new event

### Modifying Room State

- All room mutations go through `roomService` methods (never modify `Room`
  directly)
- Update `RoomService` method → update corresponding Socket.IO broadcast

### Adding Environment Variables

1. Add to root `.env.example` with default value
2. Update `scripts/env-setup.js` to distribute to backend/frontend
3. Update `backend/src/config/environment.ts` or
   `frontend/src/config/environment.ts` to load var
4. Restart dev servers (env changes require full restart)

### Writing Tests

- Test files adjacent to source: `__tests__/filename.test.ts`
- Use `describe` → `it` structure (Vitest)
- Backend: Import from `@/` and `@test/` aliases
- Frontend: Use `@testing-library/react` for component tests
- Mock Socket.IO: Use `socketTestHelpers.ts` patterns
