import React, { useEffect, useState, useCallback } from 'react';
import { NoteThread } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Bold, Italic, Code as CodeIcon, Eye, ArrowLeft, AlertCircle, Copy,
  List, ListOrdered, Quote, Link, Image, Heading1, Heading2, Heading3,
  FileText, ExternalLink, Link as LinkIcon
} from 'lucide-react';
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
  onNavigateToNote: (noteId: string) => void;
  onLinkNotes?: (sourceNoteId: string, targetNoteId: string) => void;
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
  onNavigateToNote,
  onLinkNotes,
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
  const [showLinkedNotes, setShowLinkedNotes] = useState(true);
  const [linkedNoteIds, setLinkedNoteIds] = useState<Set<string>>(new Set());
  const [linkMode, setLinkMode] = useState<'link' | 'insert'>('insert');

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
      handleWikiLinkTrigger();
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

  // Updated caret position calculation
  const getCaretCoordinates = (element: HTMLElement, position: number) => {
    const range = document.createRange();
    const textNode = element.firstChild || element;
    range.setStart(textNode, position);
    range.setEnd(textNode, position);
    
    const rect = range.getBoundingClientRect();
    const editorRect = element.getBoundingClientRect();
    
    return {
      left: rect.left - editorRect.left,
      top: rect.top - editorRect.top + rect.height,
      height: rect.height
    };
  };

  // Updated wikilink trigger
  const handleWikiLinkTrigger = (mode: 'link' | 'insert' = 'insert') => {
    setMenuPosition({
      x: 100,
      y: 200
    });
    setShowLinkMenu(true);
    setLinkQuery('');
    setLinkMode(mode);
    if (mode === 'insert') {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        setCursorPosition(textarea.selectionStart);
      }
    } else {
      setCursorPosition(null);
    }
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

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    const newContent = `${beforeText}${prefix}${selectedText}${suffix}${afterText}`;
    handleChange(newContent);

    // Reset selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        end + prefix.length
      );
    }, 0);
  };

  const toolbarItems = [
    {
      icon: <Bold className="h-4 w-4" />,
      label: 'Bold',
      action: () => insertMarkdown('**', '**'),
      shortcut: '⌘B'
    },
    {
      icon: <Italic className="h-4 w-4" />,
      label: 'Italic',
      action: () => insertMarkdown('*', '*'),
      shortcut: '⌘I'
    },
    {
      icon: <CodeIcon className="h-4 w-4" />,
      label: 'Code',
      action: () => insertMarkdown('`', '`'),
      shortcut: '⌘E'
    },
    { type: 'divider' },
    {
      icon: <Heading1 className="h-4 w-4" />,
      label: 'Heading 1',
      action: () => insertMarkdown('# '),
      shortcut: '⌘1'
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      label: 'Heading 2',
      action: () => insertMarkdown('## '),
      shortcut: '⌘2'
    },
    {
      icon: <Heading3 className="h-4 w-4" />,
      label: 'Heading 3',
      action: () => insertMarkdown('### '),
      shortcut: '⌘3'
    },
    { type: 'divider' },
    {
      icon: <List className="h-4 w-4" />,
      label: 'Bullet List',
      action: () => insertMarkdown('- '),
      shortcut: '⌘L'
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      label: 'Numbered List',
      action: () => insertMarkdown('1. '),
      shortcut: '⌘N'
    },
    {
      icon: <Quote className="h-4 w-4" />,
      label: 'Quote',
      action: () => insertMarkdown('> '),
      shortcut: '⌘.'
    },
    { type: 'divider' },
    {
      icon: <Link className="h-4 w-4" />,
      label: 'Link',
      action: () => insertMarkdown('[', '](url)'),
      shortcut: '⌘K'
    },
    {
      icon: <Image className="h-4 w-4" />,
      label: 'Image',
      action: () => insertMarkdown('![', '](url)'),
      shortcut: '⌘P'
    },
    { type: 'divider' },
    {
      icon: <FileText className="h-4 w-4" />,
      label: 'Wiki Link',
      action: handleWikiLinkTrigger,
      shortcut: '⌘L'
    },
    {
      icon: <LinkIcon className="h-4 w-4" />,
      label: 'Link Note',
      action: () => {
        setMenuPosition({
          x: 100,
          y: 200
        });
        setShowLinkMenu(true);
        setLinkQuery('');
        setCursorPosition(null); // We don't need cursor position for linking
      },
      shortcut: '⌘L'
    }
  ];

  const handleNoteSelect = useCallback((noteName: string) => {
    handleLinkSelect(noteName);
    
    // Find the note and add it to linked notes
    const selectedNote = allNotes.find(n => 
      n.name.toLowerCase() === noteName.toLowerCase()
    );
    
    if (selectedNote) {
      setLinkedNoteIds(prev => new Set([...prev, selectedNote.id]));
    }
  }, [allNotes, handleLinkSelect]);

  // Add new handler for linking notes
  const handleLinkNotes = (targetNoteId: string) => {
    if (onLinkNotes) {
      onLinkNotes(note.id, targetNoteId);
      // Add to linkedNoteIds
      setLinkedNoteIds(prev => new Set([...prev, targetNoteId]));
    }
  };

  const getLinkedNotes = () => {
    // Get notes from content links
    const wikiLinkRegex = /\[\[([^\]]+?)\]\]/g;
    const matches = Array.from(content.matchAll(wikiLinkRegex));
    const linkedNoteNames = [...new Set(matches.map(m => m[1]))];
    
    const contentLinkedNotes = linkedNoteNames
      .map(name => allNotes.find(n => 
        n.name.toLowerCase() === name.toLowerCase()
      ))
      .filter((note): note is NoteThread => note !== undefined);

    // Get manually linked notes
    const manuallyLinkedNotes = (note.linkedNotes || [])
      .map(id => allNotes.find(n => n.id === id))
      .filter((note): note is NoteThread => note !== undefined);

    // Combine and remove duplicates
    const allLinkedNotes = [...contentLinkedNotes, ...manuallyLinkedNotes];
    return Array.from(new Set(allLinkedNotes.map(n => n.id)))
      .map(id => allLinkedNotes.find(n => n.id === id))
      .filter((note): note is NoteThread => note !== undefined);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border h-[40px]">
        {/* Left section */}
        <div className="flex items-center gap-2 w-8">
          {navigationStack.length > 1 && (
            <button
              onClick={onNavigateBack}
              className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Center section */}
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
                "h-6 text-sm text-center font-mono",
                "w-[200px] bg-transparent",
                "focus:ring-0 focus:ring-offset-0",
                "border-none shadow-none"
              )}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h1 
              className={cn(
                "text-sm cursor-pointer",
                "font-mono tracking-tight",
                "transition-colors hover:text-muted-foreground"
              )}
              onDoubleClick={handleStartRename}
              title="Double click to edit name"
            >
              {note.name || 'Untitled Note'}
            </h1>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-1 w-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
            className={cn(
              "h-6 w-6",
              "text-muted-foreground hover:text-foreground",
              viewMode === 'preview' && "text-foreground"
            )}
            title={viewMode === 'edit' ? 'Preview' : 'Edit'}
          >
            {viewMode === 'edit' ? (
              <Eye className="h-4 w-4" />
            ) : (
              <CodeIcon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowLinkedNotes(!showLinkedNotes)}
            className={cn(
              "h-6 w-6",
              "text-muted-foreground hover:text-foreground",
              showLinkedNotes && "text-foreground"
            )}
            title={showLinkedNotes ? 'Hide Links' : 'Show Links'}
          >
            <FileText className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Markdown Toolbar */}
      {viewMode === 'edit' && (
        <div className="border-b border-border px-2 py-1">
          <div className="flex items-center gap-1">
            {toolbarItems.map((item, index) => 
              item.type === 'divider' ? (
                <div 
                  key={`divider-${index}`}
                  className="w-px h-6 bg-border mx-1"
                />
              ) : (
                <Button
                  key={item.label}
                  variant="ghost"
                  size="sm"
                  onClick={item.action}
                  className="px-2 h-8"
                  title={`${item.label} ${item.shortcut}`}
                >
                  {item.icon}
                </Button>
              )
            )}
          </div>
        </div>
      )}

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

      {/* Editor/Preview with Linked Notes */}
      <div className="flex-1 overflow-hidden relative">
        <div className="h-full flex">
          {/* Main content area */}
          <div className="flex-1 flex flex-col">
            {viewMode === 'edit' ? (
              <div className="h-full relative">
                <CodeEditor
                  value={content}
                  onChange={(e) => handleChange(e.target.value)}
                  onKeyDown={(e) => {
                    // Add keyboard shortcuts
                    if (e.metaKey || e.ctrlKey) {
                      switch (e.key) {
                        case 'b': 
                          e.preventDefault();
                          insertMarkdown('**', '**');
                          break;
                        case 'i':
                          e.preventDefault();
                          insertMarkdown('*', '*');
                          break;
                        case 'e':
                          e.preventDefault();
                          insertMarkdown('`', '`');
                          break;
                        case 'k':
                          e.preventDefault();
                          insertMarkdown('[', '](url)');
                          break;
                        case 'l':
                          e.preventDefault();
                          const textarea = document.querySelector('textarea');
                          if (!textarea) return;
                          
                          const rect = textarea.getBoundingClientRect();
                          const selectionStart = textarea.selectionStart;
                          const caretCoords = getCaretCoordinates(textarea, selectionStart);
                          
                          setMenuPosition({
                            x: rect.left + caretCoords.left,
                            y: rect.top + caretCoords.top + caretCoords.height
                          });
                          
                          setShowLinkMenu(true);
                          setLinkQuery('');
                          setCursorPosition(selectionStart);
                          break;
                        // ... handle other shortcuts ...
                      }
                    }
                    handleKeyDown(e);
                  }}
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
                    className="fixed z-[9999]"
                    style={{
                      left: `${menuPosition.x}px`,
                      top: `${menuPosition.y}px`,
                    }}
                  >
                    <NoteLinkMenu
                      query={linkQuery}
                      notes={allNotes.filter(n => n.id !== note.id)}
                      onSelect={handleNoteSelect}
                      onClose={() => {
                        setShowLinkMenu(false);
                        setMenuPosition(null);
                        setLinkMode('insert');
                      }}
                      currentNoteId={note.id}
                      onLinkNotes={onLinkNotes ? 
                        (targetNoteId) => onLinkNotes(note.id, targetNoteId) : 
                        undefined
                      }
                      mode={linkMode}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full overflow-y-auto p-4">
                <article className={cn(
                  "prose prose-sm dark:prose-invert max-w-none font-mono",
                  // Custom heading styles
                  "prose-h1:text-2xl prose-h1:font-bold prose-h1:tracking-tight",
                  "prose-h2:text-xl prose-h2:font-semibold prose-h2:tracking-tight",
                  "prose-h3:text-lg prose-h3:font-medium",
                  "prose-h4:text-base prose-h4:font-medium",
                  "prose-h5:text-sm prose-h5:font-medium",
                  // Consistent margins
                  "prose-headings:mt-6 prose-headings:mb-4",
                  // Proper spacing after headings
                  "[&>h1+*]:!mt-4",
                  "[&>h2+*]:!mt-4",
                  "[&>h3+*]:!mt-3",
                  "[&>h4+*]:!mt-3",
                  "[&>h5+*]:!mt-2",
                  // Proper font for all headings
                  "prose-headings:font-mono"
                )}>
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
                      },
                      // Add specific heading handlers
                      h1: ({node, ...props}) => (
                        <h1 className="scroll-m-20" {...props} />
                      ),
                      h2: ({node, ...props}) => (
                        <h2 className="scroll-m-20" {...props} />
                      ),
                      h3: ({node, ...props}) => (
                        <h3 className="scroll-m-20" {...props} />
                      ),
                      h4: ({node, ...props}) => (
                        <h4 className="scroll-m-20" {...props} />
                      ),
                      h5: ({node, ...props}) => (
                        <h5 className="scroll-m-20" {...props} />
                      ),
                    }}
                  >
                    {DOMPurify.sanitize(content)}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>

          {/* Linked Notes Panel - Now toggleable */}
          {showLinkedNotes && (
            <div className="w-[250px] border-l border-border flex flex-col">
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-medium">Linked Notes</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {(() => {
                  const linkedNotes = getLinkedNotes();

                  if (linkedNotes.length === 0) {
                    return (
                      <div className="text-sm text-muted-foreground text-center p-4">
                        No linked notes
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-1">
                      {linkedNotes.map(linkedNote => (
                        <button
                          key={linkedNote.id}
                          onClick={() => onNavigateToNote(linkedNote.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md",
                            "hover:bg-accent hover:text-accent-foreground transition-colors",
                            "text-left group"
                          )}
                        >
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{linkedNote.name}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="p-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {getLinkedNotes().length} {getLinkedNotes().length === 1 ? 'link' : 'links'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 