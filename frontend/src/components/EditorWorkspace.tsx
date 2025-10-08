import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socketService';
import { User } from '../types/index';
import RichTextEditor from './RichTextEditor';
import CompactSidebar from './CompactSidebar';
import OperationsPanel from './OperationsPanel';

interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'format' | 'move';
  user: User;
  timestamp: Date;
  description: string;
  position?: { from: number; to: number };
  content?: string;
  formatting?: string[];
  undone?: boolean; // locally marked as undone
}

interface EditorWorkspaceProps {
  documentId: string;
  users: User[];
  currentUserId?: string;
  onlineUsers: User[]; // kept for compatibility though not used; will omit from destructure
  messages: Array<{
    id: string;
    userId: string;
    nickname: string;
    content: string;
    timestamp: Date;
  }>;
  onSendMessage: (content: string) => void;
  className?: string;
}

const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  documentId,
  users,
  currentUserId,
  // onlineUsers omitted (not currently displayed in simplified layout)
  messages,
  onSendMessage,
  className = '',
}) => {
  // Simplified layout state: only track sidebar collapse & operations panel visibility
  const [showOperations, setShowOperations] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [operations, setOperations] = useState<Operation[]>([]);
  // cursor position reserved for future status display; currently unused
  // const [cursorPosition, setCursorPosition] = useState<number>(0);
  // Responsive helper: auto collapse sidebar on very small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Real-time operation history handling
  useEffect(() => {
    const handleOperationRecord = (payload: unknown) => {
      const data = payload as {
        operationId: string;
        operation: {
          type: string;
          position?: { from: number; to: number };
          content?: unknown;
          metadata?: unknown;
        };
        userId: string;
        timestamp: string;
      };

      const opUser =
        users.find(u => u.id === data.userId) ??
        ({ id: data.userId, nickname: 'Unknown', isOnline: false } as User);

      // Coerce type into supported union (fallback to 'insert')
      const allowedTypes: Operation['type'][] = [
        'insert',
        'delete',
        'format',
        'move',
      ];
      const coercedType = allowedTypes.includes(
        data.operation.type as Operation['type']
      )
        ? (data.operation.type as Operation['type'])
        : 'insert';

      const description = (() => {
        switch (coercedType) {
          case 'format':
            return 'Formatting change';
          case 'delete':
            return 'Content deleted';
          case 'move':
            return 'Content moved';
          default:
            return 'Content edited';
        }
      })();

      setOperations(prev => [
        {
          id: data.operationId,
          type: coercedType,
          user: opUser,
          timestamp: new Date(data.timestamp),
          description,
          position: data.operation.position,
          content:
            typeof data.operation.content === 'string'
              ? data.operation.content.substring(0, 80)
              : undefined,
        },
        ...prev,
      ]);
    };

    const handleOperationUndo = (payload: unknown) => {
      const data = payload as { operationId?: string };
      if (!data.operationId) {
        return;
      }
      setOperations(prev =>
        prev.map(op =>
          op.id === data.operationId ? { ...op, undone: true } : op
        )
      );
    };

    const handleOperationRedo = (payload: unknown) => {
      const data = payload as { operationId?: string };
      if (!data.operationId) {
        return;
      }
      setOperations(prev =>
        prev.map(op =>
          op.id === data.operationId ? { ...op, undone: false } : op
        )
      );
    };

    socketService.on('editor:operation-record', handleOperationRecord);
    socketService.on('editor:operation-undo', handleOperationUndo);
    socketService.on('editor:operation-redo', handleOperationRedo);

    return () => {
      socketService.off('editor:operation-record', handleOperationRecord);
      socketService.off('editor:operation-undo', handleOperationUndo);
      socketService.off('editor:operation-redo', handleOperationRedo);
    };
  }, [users]);

  // Handle document changes
  const handleDocumentChange = useCallback(
    (content: Record<string, unknown>) => {
      // Create operation record for the change
      const newOperation: Operation = {
        id: Date.now().toString(),
        type: 'insert', // This would be determined by the actual change
        user: users.find(u => u.id === currentUserId) ?? users[0],
        timestamp: new Date(),
        description: 'Document updated',
        content: `${JSON.stringify(content).substring(0, 50)}...`,
      };

      setOperations(prev => [newOperation, ...prev]);
    },
    [users, currentUserId]
  );

  // Handle cursor updates
  const handleCursorUpdate = useCallback(
    (_position: number, _selection?: { from: number; to: number }) => {
      // Cursor updates can be handled here if we add per-user status later
    },
    []
  );

  // Handle operation actions
  const handleJumpToOperation = useCallback(
    (operationId: string) => {
      const operation = operations.find(op => op.id === operationId);
      if (operation?.position) {
        // This would jump the editor to the operation position
        // console.log('Jumping to operation:', operation);
      }
    },
    [operations]
  );

  const handleRevertOperation = useCallback((operationId: string) => {
    // Instead of deleting, emit undo and mark undone; actual Y.js content reversal would be separate logic
    try {
      socketService.sendOperationUndo(operationId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to emit operation undo', err);
    }
  }, []);

  const getSidebarWidth = () => (sidebarCollapsed ? 'w-14' : 'w-80');

  const editorContainerClasses = `flex-1 min-w-0 flex flex-col bg-white`;

  return (
    <div className={`flex h-full w-full bg-white ${className}`}>
      {/* Sidebar (Users / Chat tabs) */}
      <div
        className={`${getSidebarWidth()} transition-all duration-300 flex-shrink-0 h-full border-r border-gray-200 bg-white relative`}
      >
        <CompactSidebar
          users={users}
          messages={messages}
          onSendMessage={onSendMessage}
          mode='editor'
          isCollapsed={sidebarCollapsed}
          typingUsers={[]}
          onTypingChange={() => {}}
        />
        {/* Collapse / Expand Toggle */}
        <button
          type='button'
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className='absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2 transform p-1 rounded bg-white border border-gray-200 shadow-sm hover:bg-gray-100 text-gray-500 z-20'
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 5l7 7-7 7'
              />
            </svg>
          ) : (
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
          )}
        </button>
      </div>

      {/* Editor */}
      <div className={editorContainerClasses}>
        <RichTextEditor
          documentId={documentId}
          users={users}
          currentUserId={currentUserId}
          onDocumentChange={handleDocumentChange}
          onCursorUpdate={handleCursorUpdate}
          className='flex-1'
        />
      </div>

      {/* Operations Panel (always rendered to maintain 3-column grid; can be hidden via toggle later) */}
      {showOperations && (
        <div className='flex-shrink-0 h-full border-l border-r border-gray-200 bg-white w-[clamp(16rem,22vw,20rem)] relative'>
          {/* Collapse operations panel toggle (center-left) */}
          <button
            type='button'
            onClick={() => setShowOperations(false)}
            className='absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 transform p-1 rounded bg-white border border-gray-200 shadow-sm hover:bg-gray-100 text-gray-500 z-20'
            title='Hide operations panel'
            aria-label='Hide operations panel'
          >
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 5l7 7-7 7'
              />
            </svg>
          </button>
          <OperationsPanel
            operations={operations}
            users={users}
            isVisible={showOperations}
            onJumpToOperation={handleJumpToOperation}
            onRevertOperation={handleRevertOperation}
            className='h-full'
          />
        </div>
      )}
      {!showOperations && (
        <div className='w-4 flex-shrink-0 h-full relative'>
          <button
            type='button'
            onClick={() => setShowOperations(true)}
            className='absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 transform p-1 rounded bg-white border border-gray-200 shadow-sm hover:bg-gray-100 text-gray-500 z-20'
            title='Show operations panel'
            aria-label='Show operations panel'
          >
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default EditorWorkspace;
