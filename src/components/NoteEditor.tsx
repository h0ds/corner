import React, { useEffect, useState, useRef } from 'react';
import { NoteThread, Thread } from '@/types';
import { cn } from '@/lib/utils';
import {
  Bold, Italic, Code as CodeIcon, Eye, ArrowLeft, Copy,
  List, ListOrdered, Quote, Link, Image, Heading1, Heading2, Heading3, NotebookIcon, FileText, MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { Button } from "@/components/ui/button";
import { NoteLinkMenu } from './NoteLinkMenu';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { LinkedNotes } from './LinkedNotes';
import { motion, AnimatePresence } from 'framer-motion';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ReferenceMenu } from './ReferenceMenu';
import { ChatNoteOverlay } from './ChatNoteOverlay';
import { NoteContextMenu } from './NoteContextMenu';
import { useTextHighlight } from '@/hooks/use-text-highlight';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface NoteEditorProps {
  note: NoteThread;
  onUpdate: (note: NoteThread) => void;
  initialContent: string;
  allNotes: NoteThread[];
  onNavigateBack?: () => void;
  navigationStack: string[];
  onLinkNotes?: (sourceNoteId: string, targetNoteId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  allThreads: Thread[];
  selectedModel: string;
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
  onLinkNotes,
  onNavigateToNote,
  allThreads,
  selectedModel,
}) => {
  const [content, setContent] = useState(initialContent);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [showLinkedNotes, setShowLinkedNotes] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.name);
  const [showReferenceMenu, setShowReferenceMenu] = useState(false);
  const [referenceQuery, setReferenceQuery] = useState('');
  const [referenceStartIndex, setReferenceStartIndex] = useState<number | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');

  // Add text highlight hook
  useTextHighlight({
    onHighlight: (text) => {
      if (text.length > 10) { // Only show for selections longer than 10 chars
        setHighlightedText(text);
        // Show a floating button near the selection
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Create or update floating button
          let floatingButton = document.getElementById('floating-ai-button');
          if (!floatingButton) {
            floatingButton = document.createElement('button');
            floatingButton.id = 'floating-ai-button';
            floatingButton.className = 'fixed z-50 bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs flex items-center gap-1 shadow-lg hover:bg-primary/90 transition-colors';
            floatingButton.innerHTML = `
              <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-4 4-4-4Z"/>
              </svg>
              Ask AI
            `;
            document.body.appendChild(floatingButton);
          }

          // Position the button
          floatingButton.style.left = `${rect.left + window.scrollX}px`;
          floatingButton.style.top = `${rect.top + window.scrollY - 30}px`;
          floatingButton.style.display = 'flex';

          // Add click handler
          floatingButton.onclick = () => {
            setShowAIDialog(true);
            floatingButton.style.display = 'none';
          };
        }
      }
    }
  });

  // Clean up floating button on unmount
  useEffect(() => {
    return () => {
      const floatingButton = document.getElementById('floating-ai-button');
      if (floatingButton) {
        floatingButton.remove();
      }
    };
  }, []);

  // Update content when note changes
  useEffect(() => {
    setContent(note.content);
  }, [note.id, note.content]);

  // Handle content changes
  const handleChange = (newContent: string) => {
    setContent(newContent);
    onUpdate({
      ...note,
      content: newContent,
      linkedNotes: note.linkedNotes || [],
      updatedAt: Date.now()
    });
  };

  // Handle rename
  const handleStartRename = () => {
    setIsEditing(true);
    setEditValue(note.name);
  };

  const handleFinishRename = () => {
    if (editValue.trim() && editValue !== note.name) {
      onUpdate({
        ...note,
        name: editValue.trim(),
        content: content,
        linkedNotes: note.linkedNotes || [],
        updatedAt: Date.now()
      });
    }
    setIsEditing(false);
  };

  // Handle wiki link trigger
  const handleWikiLinkTrigger = () => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = `${content.substring(0, start)}[[${selectedText}]]${content.substring(end)}`;
    handleChange(newContent);
  };

  // Add handler for chat responses
  const handleChatResponse = (response: string) => {
    // Insert response at cursor position or at end if no selection
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = content.substring(0, start) + response + content.substring(end);
      handleChange(newContent);
    } else {
      // Fallback to appending at the end
      handleChange(content + '\n\n' + response);
    }
  };

  // Toolbar items
  const toolbarItems = [
    {
      icon: <Bold className="h-4 w-4" />,
      label: 'Bold',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}**${selectedText}**${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘B'
    },
    {
      icon: <Italic className="h-4 w-4" />,
      label: 'Italic',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}*${selectedText}*${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘I'
    },
    {
      icon: <CodeIcon className="h-4 w-4" />,
      label: 'Code',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}\`${selectedText}\`${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘E'
    },
    { type: 'divider' },
    {
      icon: <Heading1 className="h-4 w-4" />,
      label: 'Heading 1',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}# ${selectedText}${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘1'
    },
    {
      icon: <Heading2 className="h-4 w-4" />,
      label: 'Heading 2',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}## ${selectedText}${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘2'
    },
    {
      icon: <Heading3 className="h-4 w-4" />,
      label: 'Heading 3',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}### ${selectedText}${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘3'
    },
    { type: 'divider' },
    {
      icon: <List className="h-4 w-4" />,
      label: 'Bullet List',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}- ${selectedText}${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘L'
    },
    {
      icon: <ListOrdered className="h-4 w-4" />,
      label: 'Numbered List',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}1. ${selectedText}${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘N'
    },
    {
      icon: <Quote className="h-4 w-4" />,
      label: 'Quote',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}> ${selectedText}${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘.'
    },
    { type: 'divider' },
    {
      icon: <Link className="h-4 w-4" />,
      label: 'Link',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}[${selectedText}](url)${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘K'
    },
    {
      icon: <Image className="h-4 w-4" />,
      label: 'Image',
      action: () => {
        const textarea = document.querySelector('textarea');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newContent = `${content.substring(0, start)}![${selectedText}](url)${content.substring(end)}`;
        handleChange(newContent);
      },
      shortcut: '⌘P'
    },
    { type: 'divider' },
    {
      icon: <NotebookIcon className="h-4 w-4" />,
      label: 'Link Note',
      action: () => setShowLinkMenu(true),
      shortcut: '⌘L'
    },
    { type: 'divider' },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: 'Ask AI',
      action: () => setShowChatOverlay(true),
      shortcut: '⌘/'
    }
  ];

  // Add handler for unlinking notes
  const handleUnlinkNote = (targetNoteId: string) => {
    onUpdate({
      ...note,
      linkedNotes: note.linkedNotes?.filter(id => id !== targetNoteId) || [],
      updatedAt: Date.now()
    });
  };

  // Handle reference trigger
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === ':' && !referenceQuery) {
      setReferenceStartIndex(e.currentTarget.selectionStart);
      setReferenceQuery('');
      setShowReferenceMenu(true);
      return;
    }

    if (e.key === 'Escape') {
      setShowReferenceMenu(false);
      setReferenceQuery('');
      setReferenceStartIndex(null);
    }
  };

  const handleEditorChange = (value: string) => {
    setContent(value);
    handleChange(value);

    // Handle reference query
    if (referenceStartIndex !== null && editorRef.current) {
      const currentPosition = editorRef.current.selectionStart;
      const textAfterTrigger = value.slice(referenceStartIndex + 1, currentPosition);
      
      if (textAfterTrigger.includes(' ') || currentPosition <= referenceStartIndex) {
        setShowReferenceMenu(false);
        setReferenceQuery('');
        setReferenceStartIndex(null);
      } else {
        setReferenceQuery(textAfterTrigger);
      }
    }
  };

  const handleReferenceSelect = (thread: Thread) => {
    if (referenceStartIndex === null || !editorRef.current) return;

    const before = content.slice(0, referenceStartIndex);
    const after = content.slice(editorRef.current.selectionStart);
    const reference = `[[${thread.name}]]`;

    const newContent = before + reference + after;
    setContent(newContent);
    handleChange(newContent);

    // Reset reference state
    setShowReferenceMenu(false);
    setReferenceQuery('');
    setReferenceStartIndex(null);
  };

  // Add handler for context menu AI prompt
  const handleContextMenuAsk = (selectedText: string) => {
    setShowChatOverlay(true);
    // Wait for overlay to mount before setting value
    setTimeout(() => {
      const input = document.querySelector('input');
      if (input) {
        input.value = `Help me understand this text: "${selectedText}"`;
        // Trigger input event to update state
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, 100);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Add ChatNoteOverlay */}
      {showChatOverlay && (
        <ChatNoteOverlay
          onClose={() => setShowChatOverlay(false)}
          onResponse={handleChatResponse}
          selectedModel={selectedModel}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border h-[40px]">
        {/* Left section */}
        <div className="flex items-center gap-2 min-w-0">
          {onNavigateBack && navigationStack.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigateBack}
              className="h-6 w-6"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          {isEditing ? (
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFinishRename();
                }
                if (e.key === 'Escape') {
                  handleFinishRename();
                }
              }}
              onBlur={handleFinishRename}
              className="h-6 text-sm px-2 py-0.5 border-none outline-none bg-transparent"
              autoFocus
            />
          ) : (
            <div 
              className="text-sm cursor-pointer truncate"
              onDoubleClick={handleStartRename}
            >
              {note.name}
            </div>
          )}
        </div>

        {/* Right section with view toggles */}
        <div className="flex items-center gap-1">
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
        </div>
      </div>

      {/* Toolbar with fixed height */}
      {viewMode === 'edit' && (
        <div className="flex-shrink-0 border-b border-border px-2 py-1">
          <div className="flex items-center gap-1">
            {toolbarItems.map((item, index) => 
              item.type === 'divider' ? (
                <div key={`divider-${index}`} className="w-px h-6 bg-border mx-1" />
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

      {/* Main content area with proper scrolling */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'edit' ? (
            <NoteContextMenu
              selectedModel={selectedModel}
              onInsertResponse={(response) => {
                if (editorRef.current) {
                  const start = editorRef.current.selectionStart;
                  const end = editorRef.current.selectionEnd;
                  const newContent = content.substring(0, start) + '\n\n' + response + '\n\n' + content.substring(end);
                  handleChange(newContent);
                  // Set cursor position after inserted text
                  setTimeout(() => {
                    if (editorRef.current) {
                      const newPosition = start + response.length + 4; // +4 for the new line characters
                      editorRef.current.setSelectionRange(newPosition, newPosition);
                      editorRef.current.focus();
                    }
                  }, 0);
                } else {
                  handleChange(content + '\n\n' + response);
                }
              }}
            >
              <div className="h-full">
                <CodeEditor
                  value={content}
                  language="markdown"
                  placeholder="Start writing..."
                  padding={16}
                  style={{
                    fontFamily: 'Space Mono, monospace',
                    fontSize: '14px',
                    backgroundColor: 'transparent',
                    height: '100%',
                    overflow: 'auto'
                  }}
                  className={cn(
                    "w-full h-full resize-none bg-transparent",
                    "focus:outline-none focus:ring-0 border-0"
                  )}
                  onChange={handleEditorChange}
                  ref={editorRef}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </NoteContextMenu>
          ) : (
            <NoteContextMenu
              selectedModel={selectedModel}
              onInsertResponse={(response) => {
                // Insert at cursor position or append to end
                const textarea = document.querySelector('textarea');
                if (textarea) {
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const newContent = content.substring(0, start) + '\n\n' + response + '\n\n' + content.substring(end);
                  handleChange(newContent);
                } else {
                  handleChange(content + '\n\n' + response);
                }
              }}
            >
              <div className="h-full overflow-y-auto p-4">
                <article className={cn(
                  "prose prose-sm dark:prose-invert max-w-none",
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
            </NoteContextMenu>
          )}
        </div>

        {/* Linked Notes Panel */}
        <AnimatePresence>
          {showLinkedNotes && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 250, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden"
            >
              <LinkedNotes
                currentNote={note}
                allNotes={allNotes}
                onNavigateToNote={onNavigateToNote || (() => {})}
                onUnlinkNote={handleUnlinkNote}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Linked Notes Toggle Button */}
      <div className="absolute bottom-4 right-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLinkedNotes(!showLinkedNotes)}
                className={cn(
                  "gap-2",
                  showLinkedNotes && "bg-accent text-accent-foreground",
                  (note.linkedNotes?.length || 0) >= 1 ? "w-[3rem]" : "w-8",
                  "h-8"
                )}
                aria-label={`${showLinkedNotes ? 'Hide' : 'Show'} linked notes`}
              >
                <FileText className="h-4 w-4" />
                {(note.linkedNotes?.length || 0) >= 1 && (
                  <span className="text-xs">{note.linkedNotes?.length}</span>
                )}
                <span className="sr-only">
                  {showLinkedNotes ? 'Hide Links' : 'Show Links'} ({note.linkedNotes?.length || 0})
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs mr-2">
              {showLinkedNotes ? 'Hide' : 'Show'} linked Notes
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Link Menu Modal */}
      {showLinkMenu && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <NoteLinkMenu
              query=""
              notes={allNotes.filter(n => n.id !== note.id)}
              onLinkNote={(targetNoteId) => {
                if (onLinkNotes) {
                  onLinkNotes(note.id, targetNoteId);
                }
                setShowLinkMenu(false);
                setShowLinkedNotes(true);
              }}
              onClose={() => setShowLinkMenu(false)}
              currentNoteId={note.id}
            />
          </div>
        </div>
      )}

      <ReferenceMenu
        query={referenceQuery}
        threads={allThreads}
        currentThreadId={note.id}
        onSelect={handleReferenceSelect}
        onClose={() => {
          setShowReferenceMenu(false);
          setReferenceQuery('');
          setReferenceStartIndex(null);
        }}
        open={showReferenceMenu}
        onQueryChange={setReferenceQuery}
      />

      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ask AI about Selection</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selected Text:</label>
              <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                {highlightedText}
              </div>
            </div>

            {/* ... rest of dialog content from NoteContextMenu ... */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};