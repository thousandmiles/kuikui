# kuikui

## Helloooo

This project is an anonymous real-time collaboration tool designed to allow
users to create and join shared workspaces without requiring authentication or
account creation. A user can create a collaboration room by entering a custom
name, and the system generates a unique shareable link. Others can join
instantly through the link and participate in real-time collaboration.

The tool leverages Node.js and WebSocket technology to provide seamless
real-time synchronization across multiple clients. It focuses on simplicity and
usability: no sign-ups, no passwords—just instant access.

The main use cases include:

- Quick brainstorming sessions

- Temporary collaboration in meetings

- Lightweight teamwork without administrative overhead

- Real-time note-taking or shared editing

The project will be developed with agile practices in mind, simulating
enterprise workflows (sprints, stories, and tasks). It will include a front-end
interface for creating/joining rooms, a back-end server for room and session
management, and support for real-time updates.

Future enhancements may include optional persistence, role management, and
integrations with third-party services.

## 🏃‍♂️ Sprint 2: Rich Text Collaborative Editor Implementation

### Overview

Building upon the completed Sprint 1 chat functionality, Sprint 2 introduces a
rich text collaborative editor using ProseMirror and Y.js. The implementation
preserves all existing chat features while adding professional-grade document
collaboration capabilities.

### Technology Stack

- **Rich Text Editor**: ProseMirror (production-grade editor used by Notion,
  GitLab)
- **Real-time Collaboration**: Y.js CRDT (Conflict-free Replicated Data Types)
- **Integration**: y-prosemirror binding for seamless collaboration
- **UI Framework**: Tailwind CSS with modern component design

### Architecture Design

#### Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Header + Mode Toggle (Chat ↔ Editor)                   │
├─────────────┬─────────────────────────┬─────────────────┤
│ CompactSidebar │ RichTextEditor       │ OperationsPanel │
│ ┌─────────┐   │                       │                 │
│ │ Users   │   │ • ProseMirror editor  │ • Edit history  │
│ │ Chat    │   │ • Collaborative       │ • User actions  │
│ └─────────┘   │   cursors             │ • Timeline view │
│               │ • Floating toolbar    │ • Undo/Redo     │
│               │ • Auto-save           │ • Search ops    │
└─────────────┴─────────────────────────┴─────────────────┘
```

#### Socket Events (Unified Prefix)

All new editor events use `editor:` prefix to maintain separation from existing
chat functionality:

**Document Management**

- `editor:document-init` - Send initial document content
- `editor:document-update` - Y.js document changes
- `editor:document-save` - Manual/auto save operations

**Real-time Collaboration**

- `editor:user-join` - User enters editor mode
- `editor:cursor-update` - Cursor position changes
- `editor:selection-update` - Text selection changes

**Operations & History**

- `editor:operation-record` - New edit operation tracked
- `editor:operation-undo` - Undo operation
- `editor:operation-redo` - Redo operation

### Implementation Phases

#### Phase 1: CompactSidebar Component

**Objective**: Create integrated sidebar combining existing UserList and
ChatArea

- Wrap existing components without modification
- Add tabbed interface (Users/Chat) with unread badges
- Implement modern user avatars with initials and colors
- Add compact user display for space efficiency
- Preserve all existing chat functionality

**Key Files**:

- `frontend/src/components/CompactSidebar.tsx` (new)
- Integrate existing `UserList.tsx` and `ChatArea.tsx`

#### Phase 2: RichTextEditor Component

**Objective**: Core rich text editing with real-time collaboration

- Integrate ProseMirror with basic formatting (bold, italic, headings)
- Add Y.js for conflict-free real-time synchronization
- Implement collaborative cursors with user-specific colors
- Create floating toolbar for formatting options
- Add document title and save status indicators

**Key Files**:

- `frontend/src/components/RichTextEditor.tsx` (new)
- `frontend/src/services/editorService.ts` (new)
- `frontend/src/services/yDocService.ts` (new)

**Dependencies to Add**:

```json
{
  "prosemirror-state": "^1.4.3",
  "prosemirror-view": "^1.32.7",
  "prosemirror-model": "^1.19.4",
  "prosemirror-schema-basic": "^1.2.2",
  "prosemirror-keymap": "^1.2.2",
  "prosemirror-history": "^1.3.2",
  "prosemirror-commands": "^1.5.2",
  "yjs": "^13.6.8",
  "y-prosemirror": "^1.2.5",
  "y-websocket": "^1.5.0"
}
```

#### Phase 3: OperationsPanel + Backend Integration

**Objective**: Operations tracking and backend document support

- Create operations timeline with user avatars and action icons
- Implement operation filtering and search functionality
- Add click-to-highlight functionality in editor
- Extend backend Room interface for document storage
- Add document persistence and operation tracking

**Key Files**:

- `frontend/src/components/OperationsPanel.tsx` (new)
- `backend/src/services/documentService.ts` (new)
- `backend/src/services/operationTrackingService.ts` (new)
- Extend `backend/src/types/index.ts` for document types

#### Phase 4: EditorWorkspace Integration

**Objective**: Complete integration and mode switching

- Create EditorWorkspace container component
- Add mode toggle in RoomPage header (Chat ↔ Editor)
- Implement responsive layout with panel collapse
- Add keyboard shortcuts and accessibility features
- Performance optimizations and error handling

**Key Files**:

- `frontend/src/components/EditorWorkspace.tsx` (new)
- `frontend/src/components/ModeToggle.tsx` (new)
- Modify `frontend/src/pages/RoomPage.tsx` (mode switching)

### Data Structures

#### Document Operation

```typescript
interface DocumentOperation {
  id: string;
  type: 'insert' | 'delete' | 'format' | 'structure' | 'save';
  userId: string;
  userNickname: string;
  userColor: string;
  timestamp: Date;
  position: { from: number; to: number };
  content?: any; // ProseMirror content
  metadata?: {
    formattingType?: 'bold' | 'italic' | 'heading' | 'list';
    contentPreview?: string;
  };
}
```

#### Editor Document

```typescript
interface EditorDocument {
  id: string;
  title: string;
  content: any; // ProseMirror JSON
  yDoc: any; // Y.js document
  lastModified: Date;
  modifiedBy: string;
  version: number;
  autoSaveEnabled: boolean;
}
```

### Key Benefits

- **Non-breaking**: All existing chat functionality preserved
- **Professional**: ProseMirror provides production-grade editing
- **Real-time**: Y.js ensures conflict-free collaboration
- **Modern UI**: Clean, responsive design with Tailwind CSS
- **Scalable**: Unified event system supports future features
- **Extensible**: Plugin-ready architecture for advanced features

### Success Criteria

1. Users can seamlessly switch between chat and editor modes
2. Multiple users can collaboratively edit documents in real-time
3. All changes are tracked with comprehensive operation history
4. Document state persists across user sessions
5. Existing chat functionality remains fully operational
6. Responsive design works across desktop and mobile devices

### Future Enhancements (Sprint 3+)

- Advanced formatting (tables, links, code blocks)
- Document templates and export functionality
- Version history with branching/merging
- Integration with file upload/sharing
- Plugin system for custom extensions
