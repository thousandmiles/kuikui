import { useEffect, useRef, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import type { MarkType } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
// Base styles for ProseMirror and Yjs cursors
import 'prosemirror-view/style/prosemirror.css';
import * as Y from 'yjs';
import {
  ySyncPlugin,
  yCursorPlugin,
  yUndoPlugin,
  undo,
  redo,
} from 'y-prosemirror';
import { socketService } from '../services/socketService';
import { SocketProvider } from '../services/socketProvider';
import { User } from '../types/index';

interface RichTextEditorProps {
  documentId: string;
  users: User[];
  currentUserId?: string;
  onDocumentChange?: (content: Record<string, unknown>) => void;
  onCursorUpdate?: (
    position: number,
    selection?: { from: number; to: number }
  ) => void;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  documentId,
  users,
  currentUserId,
  onDocumentChange,
  onCursorUpdate,
  className = '',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const yDocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SocketProvider | null>(null);
  const schemaRef = useRef<Schema | null>(null);
  // Connection status removed per UX decision (avoid showing transient 'Disconnected')
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const activityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivitySentRef = useRef<{
    edit: number;
    presence: number;
    save: number;
  }>({
    edit: 0,
    presence: 0,
    save: 0,
  });

  // Throttled generic activity signal with per-kind windows
  // - edit: 5s window
  // - presence: 8s window
  // - save: 5s window
  const pingActivity = (kind: 'edit' | 'save' | 'presence' = 'edit') => {
    const now = Date.now();
    const windowMs = kind === 'presence' ? 8000 : 5000;
    const last = lastActivitySentRef.current[kind];
    if (now - last < windowMs) {
      return;
    }
    lastActivitySentRef.current[kind] = now;
    try {
      socketService.sendEditorActivity(kind);
    } catch {
      /* ignore */
    }
    // brief UI notice
    setShowActivity(true);
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
    }
    activityTimerRef.current = setTimeout(() => setShowActivity(false), 1500);
  };

  // Get user color for collaborative cursors
  const getUserColor = (userId: string): string => {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#8B5CF6', // purple
      '#F59E0B', // yellow
      '#EF4444', // red
      '#06B6D4', // cyan
      '#84CC16', // lime
      '#F97316', // orange
    ];
    const index = userId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    // Create enhanced schema with list support
    const editorSchema = new Schema({
      nodes: addListNodes(schema.spec.nodes, 'paragraph block*', 'block'),
      marks: schema.spec.marks,
    });
    schemaRef.current = editorSchema;

    // Create Y.js document
    const yDoc = new Y.Doc();
    yDocRef.current = yDoc;

    // Create Socket provider for real-time collaboration
    const provider = new SocketProvider(`document-${documentId}`, yDoc);
    providerRef.current = provider;

    // Get Y.js shared type for ProseMirror
    const yXmlFragment = yDoc.getXmlFragment('prosemirror');

    // Create editor state with Y.js integration
    const state = EditorState.create({
      schema: editorSchema,
      plugins: [
        ySyncPlugin(yXmlFragment),
        yCursorPlugin(provider.awareness),
        yUndoPlugin(),
        history(),
        keymap({
          'Mod-z': s => {
            const did = undo(s);
            if (did) {
              pingActivity('edit');
            }
            return did;
          },
          'Mod-y': s => {
            const did = redo(s);
            if (did) {
              pingActivity('edit');
            }
            return did;
          },
          'Mod-Shift-z': s => {
            const did = redo(s);
            if (did) {
              pingActivity('edit');
            }
            return did;
          },
          // Formatting shortcuts
          'Mod-b': (s, d) => {
            const did = toggleMark(editorSchema.marks.strong)(s, d);
            if (did) {
              pingActivity('edit');
            }
            return did;
          },
          'Mod-i': (s, d) => {
            const did = toggleMark(editorSchema.marks.em)(s, d);
            if (did) {
              pingActivity('edit');
            }
            return did;
          },
        }),
        keymap(baseKeymap),
      ],
    });

    // Create the view first without custom dispatch to let internal init finish
    const view = new EditorView(editorRef.current, {
      state,
      handleDOMEvents: {
        focus: () => {
          provider.awareness.setLocalStateField('user', {
            name:
              users.find(u => u.id === currentUserId)?.nickname ?? 'Anonymous',
            color: getUserColor(currentUserId ?? ''),
          });
          return false;
        },
        blur: () => {
          setShowToolbar(false);
          return false;
        },
      },
    });
    viewRef.current = view;

    // Now attach a safe dispatchTransaction
    view.setProps({
      dispatchTransaction: tr => {
        const currentView = viewRef.current;
        if (!currentView) {
          return;
        }

        const newState = currentView.state.apply(tr);
        currentView.updateState(newState);

        if (tr.selectionSet && !tr.selection.empty) {
          const { from, to } = tr.selection;
          try {
            // Center toolbar horizontally within editor container
            const container = containerRef.current;
            if (container) {
              const rect = container.getBoundingClientRect();
              const top = rect.top + 8; // fixed 8px from top of editor area
              const left = rect.left + rect.width / 2;
              setToolbarPosition({ top, left });
            }
            setShowToolbar(true);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to compute toolbar center position', err);
          }
          onCursorUpdate?.(from, { from, to });
          // generic activity for selection change
          pingActivity('presence');
        } else if (tr.selectionSet) {
          setShowToolbar(false);
          const pos = tr.selection.from;
          onCursorUpdate?.(pos);
          pingActivity('presence');
        }

        if (tr.docChanged) {
          const json = newState.doc.toJSON() as Record<string, unknown>;
          onDocumentChange?.(json);
          // generic edit activity only
          pingActivity('edit');
        }
      },
    });

    // Set user awareness information
    provider.awareness.setLocalStateField('user', {
      name: users.find(u => u.id === currentUserId)?.nickname ?? 'Anonymous',
      color: getUserColor(currentUserId ?? ''),
    });

    // Signal presence once editor initialized
    pingActivity('presence');

    return () => {
      view.destroy();
      provider.destroy();
      yDoc.destroy();
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
    };
  }, [documentId, currentUserId, users, onDocumentChange, onCursorUpdate]);

  // Auto-save functionality
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (viewRef.current && yDocRef.current) {
        setIsSaving(true);
        // Simulate save operation
        setTimeout(() => {
          setIsSaving(false);
          setLastSaved(new Date());
        }, 500);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, []);

  // Toolbar actions
  const toggleBold = () => {
    const view = viewRef.current;
    const editorSchema = schemaRef.current;
    if (!view || !editorSchema) {
      return;
    }

    view.focus();
    const { state, dispatch } = view;
    const did = toggleMark(editorSchema.marks.strong)(state, dispatch);
    if (did) {
      pingActivity('edit');
    }
  };

  const toggleItalic = () => {
    const view = viewRef.current;
    const editorSchema = schemaRef.current;
    if (!view || !editorSchema) {
      return;
    }

    view.focus();
    const { state, dispatch } = view;
    const did = toggleMark(editorSchema.marks.em)(state, dispatch);
    if (did) {
      pingActivity('edit');
    }
  };

  // UI helpers
  const isMarkActive = (type: MarkType | null | undefined): boolean => {
    if (!type) {
      return false;
    }
    const view = viewRef.current;
    if (!view) {
      return false;
    }
    const { from, $from, to, empty } = view.state.selection;
    if (empty) {
      return !!type.isInSet(view.state.storedMarks ?? $from.marks());
    }
    return view.state.doc.rangeHasMark(from, to, type);
  };

  const manualSave = () => {
    if (viewRef.current && yDocRef.current) {
      setIsSaving(true);
      try {
        socketService.sendEditorActivity('save');
        socketService.sendDocumentSave(documentId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Failed to emit document save', err);
      }
      setTimeout(() => {
        setIsSaving(false);
        setLastSaved(new Date());
      }, 500);
    }
  };

  const formatLastSaved = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) {
      return 'Just now';
    }
    if (diffMins < 60) {
      return `${diffMins} min ago`;
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Editor Header */}
      <div className='flex items-center justify-between h-12 px-4 border-b border-gray-200 bg-gray-50'>
        <div className='flex items-center space-x-4'>
          <h2 className='text-lg font-semibold text-gray-900'>Document</h2>
          {/* Connection status indicator removed */}
        </div>

        <div className='flex items-center space-x-4'>
          {lastSaved && (
            <span className='text-sm text-gray-500'>
              Saved {formatLastSaved(lastSaved)}
            </span>
          )}
          <button
            onClick={manualSave}
            disabled={isSaving}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              isSaving
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Floating Toolbar */}
      {showToolbar && (
        <div
          className='fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center space-x-1'
          style={{
            top: toolbarPosition.top,
            left: toolbarPosition.left,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={e => e.preventDefault()}
          role='toolbar'
          aria-label='Text formatting toolbar'
          tabIndex={0}
        >
          <button
            onClick={toggleBold}
            className={`p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 ${
              isMarkActive(schemaRef.current?.marks.strong)
                ? 'bg-gray-100 text-gray-900 ring-1 ring-gray-300'
                : 'text-gray-700'
            }`}
            title='Bold (Ctrl+B)'
            aria-label='Bold'
          >
            <svg
              className='w-4 h-4'
              viewBox='0 0 24 24'
              fill='currentColor'
              aria-hidden='true'
            >
              <path d='M7 4h7a4 4 0 010 8H7V4zm0 10h8a4 4 0 010 8H7v-8z' />
            </svg>
          </button>

          <button
            onClick={toggleItalic}
            className={`p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 ${
              isMarkActive(schemaRef.current?.marks.em)
                ? 'bg-gray-100 text-gray-900 ring-1 ring-gray-300'
                : 'text-gray-700'
            }`}
            title='Italic (Ctrl+I)'
            aria-label='Italic'
          >
            <svg
              className='w-4 h-4'
              viewBox='0 0 24 24'
              fill='currentColor'
              aria-hidden='true'
            >
              <path d='M10 4a1 1 0 000 2h2.586l-4 12H6a1 1 0 100 2h8a1 1 0 100-2h-2.586l4-12H18a1 1 0 100-2h-8z' />
            </svg>
          </button>

          <div className='w-px h-6 bg-gray-300' />
          <button
            onClick={() => {
              const v = viewRef.current;
              if (!v) {
                return;
              }
              v.focus();
              const did = undo(v.state);
              if (did) {
                pingActivity('edit');
              }
            }}
            className='p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 text-gray-700'
            title='Undo (Ctrl+Z)'
            aria-label='Undo'
          >
            <svg
              className='w-4 h-4'
              viewBox='0 0 24 24'
              fill='currentColor'
              aria-hidden='true'
            >
              <path d='M3 7a1 1 0 011-1h8a7 7 0 110 14H9a1 1 0 110-2h3a5 5 0 000-10H4a1 1 0 01-1-1z' />
              <path d='M7 8l-4 3 4 3V8z' />
            </svg>
          </button>
          <button
            onClick={() => {
              const v = viewRef.current;
              if (!v) {
                return;
              }
              v.focus();
              const did = redo(v.state);
              if (did) {
                pingActivity('edit');
              }
            }}
            className='p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 text-gray-700'
            title='Redo (Ctrl+Y)'
            aria-label='Redo'
          >
            <svg
              className='w-4 h-4'
              viewBox='0 0 24 24'
              fill='currentColor'
              aria-hidden='true'
            >
              <path d='M21 7a1 1 0 00-1-1h-8a7 7 0 100 14h3a1 1 0 100-2H12a5 5 0 010-10h8a1 1 0 001-1z' />
              <path d='M17 8l4 3-4 3V8z' />
            </svg>
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div ref={containerRef} className='flex-1 overflow-auto'>
        <div
          ref={editorRef}
          className='prose prose-sm max-w-none p-4 min-h-full'
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
          }}
        />
      </div>

      {/* Status Bar */}
      <div className='h-10 px-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <span>{users.length} users</span>
          {showActivity && (
            <span className='inline-flex items-center space-x-1 text-blue-700 bg-blue-100 px-2 py-0.5 rounded'>
              <svg
                className='w-3.5 h-3.5'
                viewBox='0 0 20 20'
                fill='currentColor'
              >
                <path d='M2 10a8 8 0 1116 0 8 8 0 01-16 0zm9-4a1 1 0 10-2 0v3.586l-1.707 1.707a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11 9.586V6z' />
              </svg>
              <span>Editing activity</span>
            </span>
          )}
        </div>
        <div className='flex items-center space-x-2'>
          <span>Ctrl+Z to undo</span>
          <span>•</span>
          <span>Ctrl+Y to redo</span>
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
