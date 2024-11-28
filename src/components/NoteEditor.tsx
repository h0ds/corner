import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NoteThread, Thread } from '@/types';
import { cn } from '@/lib/utils';
import {
  Bold, Italic, Code as CodeIcon, Eye, ArrowLeft, Copy,
  List, ListOrdered, Quote, Link, Image, Heading1, Heading2, Heading3, MessageSquare, Link2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { Button } from "@/components/ui/button";
import { LinkedItems } from './LinkedItems';
import { motion, AnimatePresence } from 'framer-motion';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ReferenceMenu } from './ReferenceMenu';
import { ChatNoteOverlay } from './ChatNoteOverlay';
import { NoteContextMenu } from './NoteContextMenu';
import { useTextHighlight } from '@/hooks/use-text-highlight';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { invoke } from '@tauri-apps/api/core';
import { AudioControls } from './AudioControls';
import { NoteLinkMenu } from './NoteLinkMenu';
import { VoiceDictation } from './VoiceDictation';

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
  showTTS: boolean;
  onSplitToNote?: (sourceNoteId: string, text: string) => void;
}

const CACHE_PREFIX = 'note_cache_';
const CACHE_VERSION = 'v1';

type ViewMode = 'edit' | 'preview';

// Add CodeProps interface
interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

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
  showTTS,
  onSplitToNote,
}) => {
  const [content, setContent] = useState(initialContent);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [showLinkedNotes, setShowLinkedNotes] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.name);
  const [showReferenceMenu, setShowReferenceMenu] = useState(false);
  const [referenceQuery, setReferenceQuery] = useState('');
  const [referenceStartIndex, setReferenceStartIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showNoteLinkMenu, setShowNoteLinkMenu] = useState(false);

  // Update the text highlight hook usage
  useTextHighlight({
    onHighlight: (text, rect) => {
      if (text.length > 10) { // Only show for selections longer than 10 chars
        setHighlightedText(text);
        
        // Show a floating button near the selection
        let floatingButton = document.getElementById('floating-ai-button');
        if (!floatingButton) {
          floatingButton = document.createElement('button');
          floatingButton.id = 'floating-ai-button';
          floatingButton.className = 'fixed z-50 bg-primary text-primary-foreground rounded-xl px-2 py-1 text-xs flex items-center gap-1 shadow-lg hover:bg-primary/90 transition-colors';
          floatingButton.innerHTML = `
            <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-4 4-4-4Z"/>
            </svg>
            Ask AI
          `;
          document.body.appendChild(floatingButton);
        }

        if (rect) {
          // Position relative to the editor container
          const editorRect = document.querySelector('.CodeEditor')?.getBoundingClientRect();
          if (editorRect) {
            const top = rect.top - editorRect.top;
            const left = rect.left - editorRect.left;
            
            floatingButton.style.position = 'absolute';
            floatingButton.style.left = `${left}px`;
            floatingButton.style.top = `${top - 30}px`; // 30px above selection
            floatingButton.style.display = 'flex';
          }
        }

        // Add click handler
        floatingButton.onclick = () => {
          setShowAIDialog(true);
          floatingButton.style.display = 'none';
        };
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

  // Handle transcription results
  const handleTranscriptionResult = useCallback((text: string) => {
    console.log('NoteEditor handleTranscriptionResult:', text);
    setContent(prev => {
      console.log('NoteEditor previous content:', prev);
      const start = textareaRef.current?.selectionStart ?? prev.length;
      const end = textareaRef.current?.selectionEnd ?? prev.length;
      const newContent = prev.substring(0, start) + text + prev.substring(end);
      console.log('NoteEditor new content:', newContent);
      
      // Trigger save with the new content
      handleChange(newContent);
      
      return newContent;
    });

    // Focus the textarea after transcription
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        console.log('NoteEditor focusing textarea');
        textareaRef.current.focus();
        const newCursorPos = (textareaRef.current.selectionStart ?? 0) + text.length;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
      }
    });
  }, [handleChange]);

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
    if (referenceStartIndex !== null && textareaRef.current) {
      const currentPosition = textareaRef.current.selectionStart;
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
    if (referenceStartIndex === null || !textareaRef.current) {
      // If no cursor position (opened from toolbar), just link the thread
      onUpdate({
        ...note,
        linkedNotes: [...(note.linkedNotes || []), thread.id],
        updatedAt: Date.now()
      });

      // Show the linked panels
      setShowLinkedNotes(true);
      // Close the reference menu
      setShowReferenceMenu(false);
      setReferenceQuery('');
      setReferenceStartIndex(null);
      return;
    }
    
    // Update content and link the thread
    onUpdate({
      ...note,
      linkedNotes: [...(note.linkedNotes || []), thread.id],
      updatedAt: Date.now()
    });

    // Reset reference state
    setShowReferenceMenu(false);
    setReferenceQuery('');
    setReferenceStartIndex(null);

    // Show the linked panels
    setShowLinkedNotes(true);
  };

  const handleConvertToSpeech = async (text: string) => {
    try {
      setAudioLoading(true);
      const response = await invoke<string>('text_to_speech', { text });
      
      if (audioRef.current) {
        audioRef.current.src = response;
        audioRef.current.onended = () => {
          setAudioPlaying(false);
          audioRef.current!.src = '';
        };
        await audioRef.current.play();
        setAudioPlaying(true);
      } else {
        const audio = new Audio(response);
        audioRef.current = audio;
        audio.onended = () => {
          setAudioPlaying(false);
          audio.src = '';
        };
        await audio.play();
        setAudioPlaying(true);
      }
    } catch (error) {
      console.error('Failed to convert text to speech:', error);
      throw error;
    } finally {
      setAudioLoading(false);
    }
  };

  // Add audio control handlers
  const handlePauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setAudioPlaying(true);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      setAudioPlaying(false);
    }
  };

  const handleRestartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setAudioPlaying(true);
    }
  };

  const handleSplitToNote = (selectedText: string) => {
    if (onSplitToNote) {
      onSplitToNote(note.id, selectedText);
    }
  };

  // Add handler for linking notes
  const handleLinkNote = (targetNoteId: string) => {
    onUpdate({
      ...note,
      linkedNotes: [...(note.linkedNotes || []), targetNoteId],
      updatedAt: Date.now()
    });
    setShowLinkedNotes(true);  // Show the linked items panel
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Add ChatNoteOverlay */}
      {showChatOverlay && (
        <ChatNoteOverlay
          onClose={() => setShowChatOverlay(false)}
          onResponse={handleChatResponse}
          selectedModel={selectedModel}
          hideCloseButton
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
              className="h-6 text-lg border-none outline-none bg-transparent"
              autoFocus
            />
          ) : (
            <div 
              className="text-lg font-geist cursor-pointer truncate"
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
              onInsertResponse={handleChatResponse}
              onConvertToSpeech={handleConvertToSpeech}
              onSplitToNote={handleSplitToNote}
              showTTS={showTTS}
            >
              <div className="h-full overflow-y-auto">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Start writing..."
                  className={cn(
                    "w-full h-full resize-none bg-transparent p-4",
                    "focus:outline-none focus:ring-0 border-0",
                    "selection:bg-palette-blue selection:text-white",
                    "font-mono text-sm leading-relaxed",
                    "min-h-[calc(100vh-12rem)]"
                  )}
                  spellCheck={false}
                  data-enable-grammarly="false"
                />
              </div>
            </NoteContextMenu>
          ) : (
            <NoteContextMenu
              selectedModel={selectedModel}
              onInsertResponse={handleChatResponse}
              onConvertToSpeech={handleConvertToSpeech}
              onSplitToNote={handleSplitToNote}
              showTTS={showTTS}
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
                  "prose-headings:font-mono",
                  // Better paragraph spacing
                  "prose-p:my-4",
                  "[&>p+p]:mt-6",
                  "prose-p:leading-7",
                  // Add more padding for list items
                  "prose-ul:space-y-4",
                  "prose-ol:space-y-4",
                  "[&>ul]:mt-6",
                  "[&>ol]:mt-6",
                  "prose-li:mt-2"
                )}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Handle code blocks
                      code: ({ node, inline, className, children, ...props }: CodeProps) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const lang = match ? match[1] : '';
                        const code = String(children).replace(/\n$/, '');

                        if (inline) {
                          return (
                            <code className="bg-muted px-1.5 py-0.5 rounded-xl text-sm" {...props}>
                              {code}
                            </code>
                          );
                        }

                        return (
                          <div className="relative group">
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => navigator.clipboard.writeText(code)}
                                className="p-1.5 hover:bg-accent/10 rounded-xl text-muted-foreground hover:text-accent-foreground"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </div>
                            <pre className="!bg-muted p-4 rounded-xl">
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

        {/* Linked Panels */}
        <AnimatePresence>
          {showLinkedNotes && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 250, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 overflow-hidden"
            >
              <LinkedItems
                currentNote={note}
                allThreads={allThreads}
                onNavigateToItem={(threadId, isNote) => {
                  // Dispatch event to switch tabs if needed
                  if (!isNote) {
                    window.dispatchEvent(new CustomEvent('switch-tab', {
                      detail: { tab: 'threads' }
                    }));
                  }
                  onNavigateToNote?.(threadId);
                }}
                onUnlinkItem={handleUnlinkNote}
                onOpenLinkNote={() => setShowNoteLinkMenu(true)}
                onOpenLinkThread={() => {
                  setShowReferenceMenu(true);
                  setReferenceQuery('');
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ReferenceMenu
        query={referenceQuery}
        currentThreadId={note.id}
        onSelect={handleReferenceSelect}
        onClose={() => {
          setShowReferenceMenu(false);
          setReferenceQuery('');
          setReferenceStartIndex(null);
        }}
        open={showReferenceMenu}
        onQueryChange={setReferenceQuery}
        linkedIds={note.linkedNotes}
        showThreadsOnly={referenceStartIndex === null}
      />

      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ask AI about Selection</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selected Text:</label>
              <div className="text-sm bg-muted p-3 rounded-xl whitespace-pre-wrap">
                {highlightedText}
              </div>
            </div>

            {/* ... rest of dialog content from NoteContextMenu ... */}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Add audio controls */}
      {(audioPlaying || audioLoading) && audioRef.current?.src && (
        <div className="absolute bottom-4 left-4">
          <AudioControls
            isPlaying={audioPlaying}
            isLoading={audioLoading}
            onPlay={handlePlayAudio}
            onStop={handleStopAudio}
            onRestart={handleRestartAudio}
          />
        </div>
      )}

      {/* Bottom right controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                {viewMode === 'edit' && (
                  <VoiceDictation 
                    onTranscriptionResult={handleTranscriptionResult}
                    className="shrink-0"
                  />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              Voice dictation
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-xl",
                  showLinkedNotes && "bg-accent text-accent-foreground"
                )}
                onClick={() => setShowLinkedNotes(!showLinkedNotes)}
              >
                <Link2 className="h-5 w-5" />
                <span className="sr-only">Toggle linked items</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {showLinkedNotes ? 'Hide linked items' : 'Show linked items'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Add NoteLinkMenu */}
      <NoteLinkMenu
        currentNoteId={note.id}
        notes={allNotes}
        onSelect={handleLinkNote}
        onClose={() => setShowNoteLinkMenu(false)}
        open={showNoteLinkMenu}
        linkedNoteIds={note.linkedNotes}
      />
    </div>
  );
};