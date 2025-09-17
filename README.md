# kuikui

## Helloooo

This project is an anonymous real-time collaboration tool designed to allow users to create and join shared workspaces without requiring authentication or account creation. A user can create a collaboration room by entering a custom name, and the system generates a unique shareable link. Others can join instantly through the link and participate in real-time collaboration.

The tool leverages Node.js and WebSocket technology to provide seamless real-time synchronization across multiple clients. It focuses on simplicity and usability: no sign-ups, no passwords—just instant access.

The main use cases include:

- Quick brainstorming sessions

- Temporary collaboration in meetings

- Lightweight teamwork without administrative overhead

- Real-time note-taking or shared editing

The project will be developed with agile practices in mind, simulating enterprise workflows (sprints, stories, and tasks). It will include a front-end interface for creating/joining rooms, a back-end server for room and session management, and support for real-time updates.

Future enhancements may include optional persistence, role management, and integrations with third-party services.

## 🏃 Sprint 1: Project Setup & Chatroom Feature
### Story 1.1: As a user, I want to create a room and get a unique link so that I can invite others.

#### Task 1.1.1: Backend API - Create Room
Description: Implement /create-room API that generates and returns a unique room ID.

#### Task 1.1.2: Store Room Information
Description: Store room ID and creation time in memory or database.

#### Task 1.1.3: Frontend Button - Create Room
Description: Add a “Create Room” button that calls the API and shows the room link.

### Story 1.2: As a user, I want to join a room by link and enter a nickname.

#### Task 1.2.1: Frontend Nickname Input
Description: Prompt the user to enter a nickname before joining.

#### Task 1.2.2: Backend API - Join Room
Description: Validate that the room exists and return success/failure.

#### Task 1.2.3: Frontend Routing
Description: Parse room ID from link and route to the corresponding room page.

### Story 1.3: As a user, I want to see the list of nicknames in the room.

#### Task 1.3.1: WebSocket - User Join Broadcast
Description: Broadcast updated user list when a new user joins.

#### Task 1.3.2: Frontend User List UI
Description: Display a list of active users in the room.

#### Task 1.3.3: Handle User Leave
Description: Update user list when someone disconnects.

### Story 1.4: As a user, I want to send chat messages in the room and see them in real time.

#### Task 1.4.1: Frontend Chat UI
Description: Create a message input box and message display area.

#### Task 1.4.2: WebSocket - Message Broadcast
Description: Broadcast messages from server to all users in the room.

#### Task 1.4.3: Frontend Real-time Rendering
Description: Render new messages immediately in the chat UI.

### Story 1.5: As a developer, I want to set up the project framework (Node.js + Express + WebSocket + React/Vue).

#### Task 1.5.1: Backend Project Initialization
Description: Set up Node.js + Express + WebSocket backend skeleton.

#### Task 1.5.2: Frontend Project Initialization
Description: Set up React or Vue frontend with basic routing.

#### Task 1.5.3: Configure CORS and Environment Variables
Description: Configure server to allow frontend-backend communication.

## 🏃 Sprint 2: Collaborative Text Editor (MVP)
### Story 2.1: As a user, I want a shared text editor in the room.

#### Task 2.1.1: Frontend Editor UI
Description: Add an editable text area to the room page.

#### Task 2.1.2: Backend Document Initialization
Description: Initialize document state for each room.

#### Task 2.1.3: WebSocket - Send Initial Document
Description: New users receive the current document upon joining.

### Story 2.2: As a user, I want text edits to be synced in real time with all users.

#### Task 2.2.1: Frontend - Detect Input Changes
Description: Capture text changes and send updates to server.

#### Task 2.2.2: Backend - Broadcast Document Updates
Description: Broadcast changes to all connected clients.

#### Task 2.2.3: Frontend - Update Editor
Description: Apply received updates to the text editor.

### Story 2.3: As a user, I want to see "User is typing" indicators.

#### Task 2.3.1: Frontend - Capture Typing State
Description: Send typing events when a user is entering text.

#### Task 2.3.2: Backend - Broadcast Typing State
Description: Forward typing status to other users in the room.

#### Task 2.3.3: Frontend - Display Typing Indicator
Description: Show "User X is typing" in the UI.

### Story 2.4: As a user, I want to see the latest document when I join a room.

#### Task 2.4.1: Backend - Maintain Current Document
Description: Store the latest version of the document in server state.

#### Task 2.4.2: Backend - Send Document on Join
Description: Provide the stored document when a new user joins.

#### Task 2.4.3: Frontend - Load Document
Description: Load the received document into the editor on join.

### Story 2.5: As a developer, I want to manage room state on the server.

#### Task 2.5.1: Room State Data Structure
Description: Design in-memory or DB schema for room state.

#### Task 2.5.2: Lifecycle Management
Description: Update state on user join/leave.

#### Task 2.5.3: Testing Room Sync Logic
Description: Simulate multiple users to test sync.

## 🏃 Sprint 3: Room Management & UX Improvements
### Story 3.1: As a user, I want rooms to auto-expire after 24h of inactivity.

#### Task 3.1.1: Track Last Active Time
Description: Store a timestamp of last activity per room.

#### Task 3.1.2: Scheduled Cleanup Job
Description: Run cleanup job to remove inactive rooms.

#### Task 3.1.3: State Cleanup
Description: Delete room state when expired.

### Story 3.2: As a user, I want to see online/offline status of room participants.

#### Task 3.2.1: WebSocket Heartbeat
Description: Send regular heartbeats to check connectivity.

#### Task 3.2.2: Backend - Update User Status
Description: Track user online/offline status in room state.

#### Task 3.2.3: Frontend - Show User Status
Description: Display green/red indicators in user list.

### Story 3.3: As a user, I want to use a different nickname each time I join.

#### Task 3.3.1: Frontend - Reset Nickname Input
Description: Ask user for nickname each time they join a room.

#### Task 3.3.2: Backend - Clear Nickname on Exit
Description: Remove nickname from room when user leaves.

### Story 3.4: As a developer, I want to handle errors gracefully (e.g., invalid room, empty nickname).

#### Task 3.4.1: Backend - Validate Room ID
Description: Return error if room does not exist.

#### Task 3.4.2: Backend - Validate Nickname
Description: Reject empty or invalid nicknames.

#### Task 3.4.3: Frontend - Show Error Messages
Description: Display error popups for invalid actions.

## 🏃 Sprint 4: Synchronization & Conflict Resolution
### Story 4.1: As a user, I want edits to never be lost when multiple people type (CRDT/Y.js).

#### Task 4.1.1: Integrate Y.js or CRDT Library
Description: Replace basic sync logic with CRDT-based merging.

#### Task 4.1.2: Backend - Handle CRDT Messages
Description: Manage document updates and conflict resolution.

#### Task 4.1.3: Frontend - Hook Editor into CRDT
Description: Ensure text editor integrates with CRDT updates.

### Story 4.2: As a user, I want to see other users’ cursor positions.

#### Task 4.2.1: Frontend - Capture Cursor Position
Description: Detect and send current cursor position.

#### Task 4.2.2: Backend - Broadcast Cursor Position
Description: Distribute cursor updates to room participants.

#### Task 4.2.3: Frontend - Render Cursor Indicators
Description: Show different colored cursors per user.

### Story 4.3: As a user, I want document state to sync after reconnecting from network issues.

#### Task 4.3.1: Frontend - Detect Disconnection
Description: Detect when user is offline.

#### Task 4.3.2: Backend - Send Document Snapshot
Description: Provide latest content when user reconnects.

#### Task 4.3.3: Frontend - Restore Editor State
Description: Reload document and cursor after reconnect.

### Story 4.4: As a developer, I want robust reconnection handling.

#### Task 4.4.1: Frontend - WebSocket Reconnect
Description: Implement auto-reconnect with backoff strategy.

#### Task 4.4.2: Backend - Session Recovery
Description: Restore user session after reconnect.

#### Task 4.4.3: Testing - Simulate Network Failures
Description: Test reconnect scenarios with multiple users.

## 🏃 Sprint 5: Advanced Features & Deployment
### Story 5.1: As a user, I want a whiteboard to draw and sync sketches.

#### Task 5.1.1: Frontend - Whiteboard Component
Description: Implement basic drawing functionality.

#### Task 5.1.2: Backend - Sync Whiteboard Events
Description: Broadcast drawing paths to other users.

#### Task 5.1.3: Frontend - Render Multi-user Whiteboard
Description: Merge drawings from multiple users.

### Story 5.2: As a user, I want document version history and rollback.

#### Task 5.2.1: Backend - Save Document Snapshots
Description: Periodically save versions of the document.

#### Task 5.2.2: Frontend - History UI
Description: Provide UI to browse and select versions.

#### Task 5.2.3: Backend - Restore Document Version
Description: Allow rollback to a selected version.

### Story 5.3: As a user, I want to upload and share files (e.g., images).

#### Task 5.3.1: Frontend - File Upload
Description: Add file upload button and drag-and-drop.

#### Task 5.3.2: Backend - Store Files and Return URL
Description: Save uploaded file and return a link.

#### Task 5.3.3: Frontend - Display Uploaded Files
Description: Show shared files inline in the room.

### Story 5.4: As a developer, I want to deploy with Docker for easy setup.

#### Task 5.4.1: Backend Dockerfile
Description: Create Dockerfile for Node.js backend.

#### Task 5.4.2: Frontend Dockerfile
Description: Create Dockerfile for React/Vue frontend.

#### Task 5.4.3: Docker Compose Setup
Description: Create docker-compose.yml to run frontend, backend, and DB together.