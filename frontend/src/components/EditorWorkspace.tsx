import { useState, useEffect, useCallback } from 'react';
import { User } from '../types/index';
import RichTextEditor from './RichTextEditor';
import CompactSidebar from './CompactSidebar';
import OperationsPanel from './OperationsPanel';
import { socketService } from '../services/socketService';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showActivityPanel, setShowActivityPanel] = useState(true);
  type ActivityKind = 'edit' | 'presence' | 'save';
  type ActivityItem = {
    id: string;
    userId?: string;
    kind: ActivityKind;
    timestamp: Date;
  };
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [recentActiveByUser, setRecentActiveByUser] = useState<
    Record<string, number>
  >({});

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

  // Simple activity aggregation: listen to generic activity events
  useEffect(() => {
    const handler = (payload: unknown) => {
      const data = payload as {
        kind?: ActivityKind;
        ts?: string;
        userId?: string;
      };
      const kind: ActivityKind = data.kind ?? 'presence';
      const ts = data.ts ? new Date(data.ts) : new Date();
      const id = `${ts.getTime()}-${kind}-${Math.random().toString(36).slice(2, 8)}`;

      // Coalesce same user/kind within an 8s window to reduce feed spam
      setActivities(prev => {
        const windowMs = 8000;
        const uid = data.userId;
        const cutoff = ts.getTime() - windowMs;
        // If the most recent matching item exists within window, update its timestamp instead of adding
        for (let i = 0; i < Math.min(prev.length, 10); i++) {
          const item = prev[i];
          if (
            item.kind === kind &&
            item.userId === uid &&
            item.timestamp.getTime() >= cutoff
          ) {
            const updated = [...prev];
            updated[i] = { ...item, timestamp: ts };
            return updated;
          }
        }
        return [
          { id, userId: data.userId, kind, timestamp: ts },
          ...prev,
        ].slice(0, 100);
      });
      if (data.userId) {
        setRecentActiveByUser(prev => ({
          ...prev,
          [data.userId!]: ts.getTime(),
        }));
      }
    };
    // subscribe
    socketService.on('editor:activity', handler);
    return () => {
      socketService.off('editor:activity', handler);
    };
  }, []);

  // Local helper to record activity (for local user)
  const recordActivity = useCallback(
    (kind: ActivityKind) => {
      if (!currentUserId) {
        return;
      }
      const ts = new Date();
      const id = `${ts.getTime()}-${kind}-local`;
      // Coalesce local as well
      setActivities(prev => {
        const windowMs = 8000;
        const cutoff = ts.getTime() - windowMs;
        for (let i = 0; i < Math.min(prev.length, 10); i++) {
          const item = prev[i];
          if (
            item.kind === kind &&
            item.userId === currentUserId &&
            item.timestamp.getTime() >= cutoff
          ) {
            const updated = [...prev];
            updated[i] = { ...item, timestamp: ts };
            return updated;
          }
        }
        return [
          { id, userId: currentUserId, kind, timestamp: ts },
          ...prev,
        ].slice(0, 100);
      });
      setRecentActiveByUser(prev => ({
        ...prev,
        [currentUserId]: ts.getTime(),
      }));
    },
    [currentUserId]
  );

  // Handle document changes
  const handleDocumentChange = useCallback(
    (_content: Record<string, unknown>) => {
      // Keep panel simple: just record an edit activity for local user
      recordActivity('edit');
    },
    [recordActivity]
  );

  // Handle cursor updates
  const handleCursorUpdate = useCallback(
    (_position: number, _selection?: { from: number; to: number }) => {
      // Treat cursor/selection changes as presence activity for local user
      recordActivity('presence');
    },
    [recordActivity]
  );

  // Handle operation actions
  // Jump/revert operations removed

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
      {/* Simple Activity Panel via OperationsPanel simple mode */}
      {showActivityPanel ? (
        <div className='flex-shrink-0 h-full border-l border-r border-gray-200 bg-white w-[clamp(16rem,22vw,20rem)] relative'>
          <button
            type='button'
            onClick={() => setShowActivityPanel(false)}
            className='absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 transform p-1 rounded bg-white border border-gray-200 shadow-sm hover:bg-gray-100 text-gray-500 z-20'
            title='Hide activity panel'
            aria-label='Hide activity panel'
          >
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
          </button>
          <OperationsPanel
            users={users}
            isVisible={true}
            activities={activities}
            recentActiveByUser={recentActiveByUser}
          />
        </div>
      ) : (
        <div className='w-4 flex-shrink-0 h-full relative'>
          <button
            type='button'
            onClick={() => setShowActivityPanel(true)}
            className='absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 transform p-1 rounded bg-white border border-gray-200 shadow-sm hover:bg-gray-100 text-gray-500 z-20'
            title='Show activity panel'
            aria-label='Show activity panel'
          >
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
          </button>
        </div>
      )}
    </div>
  );
};

export default EditorWorkspace;
