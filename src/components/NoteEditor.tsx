import React, { useEffect, useState, useCallback } from 'react';
import { NoteThread } from '@/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, AlertCircle, Copy, Eye, Code as CodeIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteLinkMenu } from './NoteLinkMenu';
import CodeEditor from '@uiw/react-textarea-code-editor';

interface NoteEditorProps {
  note: NoteThread;
  onUpdate: (note: NoteThread) => void;
  initialContent: string;
  allNotes: NoteThread[];
  onNavigateBack?: () => void;
  navigationStack: string[];
}

const CACHE_PREFIX = 'note_cache_';
const CACHE_VERSION = 'v1';

type ViewMode = 'edit' | 'preview';

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onUpdate,
  initialContent,
  onNavigateBack,
  navigationStack,
  allNotes,
}) => {
  const [content, setContent] = useState<string>(
    typeof initialContent === 'string' ? initialContent : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.name);
  const cacheKey = `${CACHE_PREFIX}${CACHE_VERSION}_${note.id}`;
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');

  // Load cached content on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Only use cache if it's newer than the note's last update
        if (parsedCache.timestamp > (note.updatedAt || 0)) {
          // Ensure cached content is a string
          const cachedContent = typeof parsedCache.content === 'string' 
            ? parsedCache.content 
            : '';
          setContent(cachedContent);
          setError('Found unsaved changes. Would you like to restore them?');
        }
      }
    } catch (e) {
      console.error('Error loading cache:', e);
      // Don't show error for cache loading failures
    }
  }, [note.id, note.updatedAt]);

  const handleChange = (value: string | undefined) => {
    // Ensure value is always a string
    const newContent = typeof value === 'string' ? value : '';
    setContent(newContent);
    
    try {
      // Save to cache
      localStorage.setItem(cacheKey, JSON.stringify({
        content: newContent,
        timestamp: Date.now()
      }));

      // Update note
      onUpdate({
        ...note,
        content: newContent
      });

    } catch (e) {
      console.error('Error saving changes:', e);
      setError('Failed to save changes. Please try again.');
    }
  };

  const clearCache = () => {
    try {
      localStorage.removeItem(cacheKey);
      setError(null);
    } catch (e) {
      console.error('Error clearing cache:', e);
      setError('Failed to clear cache. Please try manually clearing your browser storage.');
    }
  };

  const restoreCache = () => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const restoredContent = parsedCache.content || '';
        setContent(restoredContent);
        onUpdate({
          ...note,
          content: restoredContent
        });
      }
      setError(null);
    } catch (e) {
      console.error('Error restoring cache:', e);
      setError('Failed to restore cached content.');
    }
  };

  const resetEditor = () => {
    try {
      clearCache();
      const resetContent = initialContent || '';
      setContent(resetContent);
      onUpdate({
        ...note,
        content: resetContent
      });
      setError(null);
    } catch (e) {
      console.error('Error resetting editor:', e);
      setError('Failed to reset editor.');
    }
  };

  const handleStartRename = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(note.name);
  };

  const handleFinishRename = () => {
    if (editValue.trim() && editValue !== note.name) {
      onUpdate({
        ...note,
        name: editValue.trim()
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    
    // Check for [[ to trigger link menu
    if (e.key === '[' && value[selectionStart - 1] === '[') {
      e.preventDefault();
      
      // Calculate cursor position for menu
      const rect = textarea.getBoundingClientRect();
      const caretCoords = getCaretCoordinates(textarea, selectionStart);
      
      setMenuPosition({
        x: rect.left + caretCoords.left,
        y: rect.top + caretCoords.top + caretCoords.height
      });
      
      setShowLinkMenu(true);
      setLinkQuery('');
      setCursorPosition(selectionStart);
      return;
    }

    // Close link menu on escape
    if (e.key === 'Escape' && showLinkMenu) {
      e.preventDefault();
      setShowLinkMenu(false);
      return;
    }

    // Handle backspace in link menu
    if (e.key === 'Backspace' && showLinkMenu) {
      if (linkQuery === '') {
        setShowLinkMenu(false);
      }
      setLinkQuery(prev => prev.slice(0, -1));
      return;
    }

    // Update link query
    if (showLinkMenu && e.key.length === 1) {
      e.preventDefault();
      setLinkQuery(prev => prev + e.key);
      return;
    }
  }, [showLinkMenu]);

  const handleLinkSelect = useCallback((noteName: string) => {
    if (cursorPosition === null) return;

    const newContent = content.slice(0, cursorPosition - 1) + 
      `[[${noteName}]]` + 
      content.slice(cursorPosition);

    setContent(newContent);
    setShowLinkMenu(false);
    setLinkQuery('');
    setCursorPosition(null);

    // Update note with new content
    onUpdate({
      ...note,
      content: newContent
    });
  }, [content, cursorPosition, note, onUpdate]);

  // Helper function to get caret coordinates
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const { offsetLeft: elementX, offsetTop: elementY } = element;
    const div = document.createElement('div');
    const styles = getComputedStyle(element);
    const properties = [
      'fontFamily',
      'fontSize',
      'fontWeight',
      'wordWrap',
      'whiteSpace',
      'borderLeftWidth',
      'borderTopWidth',
      'paddingLeft',
      'paddingTop',
      'lineHeight',
    ];

    properties.forEach(prop => {
      // @ts-ignore - dynamic property access
      div.style[prop] = styles[prop];
    });

    div.textContent = element.value.substring(0, position);
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.width = `${element.offsetWidth}px`;

    document.body.appendChild(div);
    const coordinates = {
      left: div.offsetWidth + elementX,
      top: div.offsetHeight + elementY,
      height: parseInt(styles.lineHeight),
    };
    document.body.removeChild(div);

    return coordinates;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showLinkMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('.note-link-menu')) {
          setShowLinkMenu(false);
          setMenuPosition(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLinkMenu]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <div className="flex items-center gap-2 w-full">
          <div className="flex items-center gap-2">
            {navigationStack.length > 1 && (
              <button
                onClick={onNavigateBack}
                className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex-1 flex justify-center">
            {isEditing ? (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename();
                  if (e.key === 'Escape') {
                    setEditValue(note.name);
                    setIsEditing(false);
                  }
                }}
                className={cn(
                  "h-8 text-sm text-center",
                  "w-[200px]",
                  "font-mono"
                )}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h1 
                className={cn(
                  "text-sm cursor-pointer hover:text-foreground/80",
                  "font-mono tracking-tight",
                  "transition-colors"
                )}
                onDoubleClick={handleStartRename}
                title="Double click to edit name"
              >
                {note.name || 'Untitled Note'}
              </h1>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('edit')}
              className={cn(
                "px-2",
                viewMode === 'edit' ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <CodeIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('preview')}
              className={cn(
                "px-2",
                viewMode === 'preview' ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="m-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-4">
            {error}
            {error.includes('unsaved changes') ? (
              <>
                <Button variant="outline" size="sm" onClick={restoreCache}>
                  Restore
                </Button>
                <Button variant="outline" size="sm" onClick={clearCache}>
                  Discard
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={resetEditor}>
                Reset Editor
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Editor/Preview */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'edit' ? (
          <div className="h-full relative">
            <CodeEditor
              value={content}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              language="markdown"
              placeholder="Start writing..."
              padding={16}
              style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: '14px',
                backgroundColor: 'transparent',
                minHeight: '100%'
              }}
              className={cn(
                "w-full h-full resize-none bg-transparent",
                "focus:outline-none focus:ring-0 border-0"
              )}
            />
            {showLinkMenu && menuPosition && (
              <div 
                className="fixed z-50 note-link-menu"
                style={{
                  left: `${menuPosition.x}px`,
                  top: `${menuPosition.y}px`,
                }}
              >
                <NoteLinkMenu
                  query={linkQuery}
                  notes={allNotes.filter(n => n.id !== note.id)}
                  onSelect={(noteName) => {
                    handleLinkSelect(noteName);
                    setMenuPosition(null);
                  }}
                  onClose={() => {
                    setShowLinkMenu(false);
                    setMenuPosition(null);
                  }}
                  currentNoteId={note.id}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <article className="prose prose-sm dark:prose-invert max-w-none font-mono">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Handle code blocks
                  code({node, inline, className, children, ...props}) {
                    const match = /language-(\w+)/.exec(className || '');
                    const lang = match ? match[1] : '';
                    const code = String(children).replace(/\n$/, '');

                    if (inline) {
                      return (
                        <code className="bg-muted px-1.5 py-0.5 rounded-md text-sm" {...props}>
                          {code}
                        </code>
                      );
                    }

                    return (
                      <div className="relative group">
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigator.clipboard.writeText(code)}
                            className="p-1.5 hover:bg-accent/10 rounded-md text-muted-foreground hover:text-accent-foreground"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        <pre className="!bg-muted p-4 rounded-md">
                          <code className={className} {...props}>
                            {code}
                          </code>
                        </pre>
                      </div>
                    );
                  },
                  // Handle wiki-style links
                  a({node, children, href, ...props}) {
                    if (href?.startsWith('[[') && href?.endsWith(']]')) {
                      const noteName = href.slice(2, -2);
                      const linkedNote = allNotes.find(n => 
                        n.name.toLowerCase() === noteName.toLowerCase()
                      );
                      
                      return (
                        <a
                          className={cn(
                            "text-primary underline underline-offset-4",
                            !linkedNote && "text-destructive"
                          )}
                          {...props}
                        >
                          {String(children)}
                        </a>
                      );
                    }
                    
                    return (
                      <a 
                        className="text-primary underline underline-offset-4" 
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {String(children)}
                      </a>
                    );
                  }
                }}
              >
                {DOMPurify.sanitize(content)}
              </ReactMarkdown>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}; 