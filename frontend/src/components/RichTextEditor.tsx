import { useEffect, useRef, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { Schema } from 'prosemirror-model';
import { schema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { keymap } from 'prosemirror-keymap';
import { history } from 'prosemirror-history';
import { baseKeymap } from 'prosemirror-commands';
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

    // Removed connection status listener

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
          'Mod-z': state => {
            const didUndo = undo(state); // y-prosemirror undo expects state only
            if (didUndo) {
              try {
                socketService.sendOperationUndo('local-undo');
              } catch {
                // ignore network/connection errors for undo broadcast
              }
            }
            return didUndo;
          },
          'Mod-y': state => {
            const didRedo = redo(state);
            if (didRedo) {
              try {
                socketService.sendOperationRedo('local-redo');
              } catch {
                // ignore network/connection errors for redo broadcast
              }
            }
            return didRedo;
          },
          'Mod-Shift-z': state => {
            const didRedo = redo(state);
            if (didRedo) {
              try {
                socketService.sendOperationRedo('local-redo');
              } catch {
                // ignore network/connection errors for redo broadcast
              }
            }
            return didRedo;
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
          try {
            socketService.sendSelectionUpdate({ from, to });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to send selection update', err);
          }
        } else if (tr.selectionSet) {
          setShowToolbar(false);
          const pos = tr.selection.from;
          onCursorUpdate?.(pos);
          try {
            socketService.sendCursorUpdate({ from: pos, to: pos });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to send cursor update', err);
          }
        }

        if (tr.docChanged) {
          const json = newState.doc.toJSON() as Record<string, unknown>;
          onDocumentChange?.(json);
          try {
            socketService.sendOperationRecord({
              type: 'edit',
              position: {
                from: tr.mapping.maps.length,
                to: tr.mapping.maps.length,
              },
              content: json,
            });
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('Failed to send operation record', err);
          }
        }
      },
    });

    // Set user awareness information
    provider.awareness.setLocalStateField('user', {
      name: users.find(u => u.id === currentUserId)?.nickname ?? 'Anonymous',
      color: getUserColor(currentUserId ?? ''),
    });

    // Emit document lifecycle events once editor initialized
    try {
      socketService.sendDocumentInit(documentId);
      socketService.sendUserJoin(documentId);
    } catch {
      // ignore if socket not ready
    }

    return () => {
      view.destroy();
      provider.destroy();
      yDoc.destroy();
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

    const { state, dispatch } = view;
    const markType = editorSchema.marks.strong;
    const { from, to } = state.selection;

    const removing = markType.isInSet(state.doc.nodeAt(from)?.marks ?? []);
    if (removing) {
      dispatch(state.tr.removeMark(from, to, markType));
    } else {
      dispatch(state.tr.addMark(from, to, markType.create()));
    }
    // Emit semantic operation (format)
    try {
      socketService.sendOperation({
        id: `${Date.now()}-bold-${from}-${to}`,
        type: 'format',
        description: removing ? 'Removed bold' : 'Applied bold',
        position: { from, to },
        formatting: ['bold'],
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to emit bold operation', err);
    }
  };

  const toggleItalic = () => {
    const view = viewRef.current;
    const editorSchema = schemaRef.current;
    if (!view || !editorSchema) {
      return;
    }

    const { state, dispatch } = view;
    const markType = editorSchema.marks.em;
    const { from, to } = state.selection;

    const removing = markType.isInSet(state.doc.nodeAt(from)?.marks ?? []);
    if (removing) {
      dispatch(state.tr.removeMark(from, to, markType));
    } else {
      dispatch(state.tr.addMark(from, to, markType.create()));
    }
    try {
      socketService.sendOperation({
        id: `${Date.now()}-italic-${from}-${to}`,
        type: 'format',
        description: removing ? 'Removed italics' : 'Applied italics',
        position: { from, to },
        formatting: ['italic'],
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to emit italic operation', err);
    }
  };

  const insertHeading = (level: number) => {
    const view = viewRef.current;
    const editorSchema = schemaRef.current;
    if (!view || !editorSchema) {
      return;
    }

    const { state, dispatch } = view;
    const { from } = state.selection;
    const headingType = editorSchema.nodes.heading;

    dispatch(state.tr.setBlockType(from, from, headingType, { level }));
    try {
      socketService.sendOperation({
        id: `${Date.now()}-heading-${level}-${from}`,
        type: 'format',
        description: `Set heading level ${level}`,
        position: { from, to: from },
        formatting: [`heading-${level}`],
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to emit heading operation', err);
    }
  };

  const manualSave = () => {
    if (viewRef.current && yDocRef.current) {
      setIsSaving(true);
      try {
        socketService.sendDocumentSave(documentId, yDocRef.current.toJSON());
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
        >
          <button
            onClick={toggleBold}
            className='p-2 text-gray-600 hover:bg-gray-100 rounded'
            title='Bold (Cmd+B)'
          >
            <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M3 4a1 1 0 011-1h6a4 4 0 014 4v1a4 4 0 01-2.4 3.664A4.5 4.5 0 0114 16v1a4 4 0 01-4 4H4a1 1 0 01-1-1V4zm8 7V9a2 2 0 00-2-2H6v4h3a2 2 0 002-2zM6 13v4h4a2 2 0 002-2v-1a2.5 2.5 0 00-2.5-2.5H6z'
                clipRule='evenodd'
              />
            </svg>
          </button>

          <button
            onClick={toggleItalic}
            className='p-2 text-gray-600 hover:bg-gray-100 rounded'
            title='Italic (Cmd+I)'
          >
            <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
              <path d='M8 2a1 1 0 000 2h1.586l-4.293 4.293a1 1 0 000 1.414L9.586 14H8a1 1 0 100 2h4a1 1 0 000-2h-1.586l4.293-4.293a1 1 0 000-1.414L10.414 4H12a1 1 0 100-2H8z' />
            </svg>
          </button>

          <div className='w-px h-6 bg-gray-300' />

          <button
            onClick={() => insertHeading(1)}
            className='px-2 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded'
            title='Heading 1'
          >
            H1
          </button>

          <button
            onClick={() => insertHeading(2)}
            className='px-2 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded'
            title='Heading 2'
          >
            H2
          </button>
        </div>
      )}

      {/* Editor Content */}
      <div ref={containerRef} className='flex-1 overflow-auto'>
        <div
          ref={editorRef}
          className='prose prose-sm max-w-none p-6 min-h-full focus:outline-none'
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
          }}
        />
      </div>

      {/* Status Bar */}
      <div className='flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500'>
        <div className='flex items-center space-x-4'>
          <span>{users.length} users</span>
          <span>Real-time collaboration active</span>
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
