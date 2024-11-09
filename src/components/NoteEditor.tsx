import React, { useEffect, useState, useCallback } from 'react';
import { NoteThread } from '@/types';
import { cn } from '@/lib/utils';
import { 
  Bold, Italic, Code as CodeIcon, Eye, ArrowLeft, AlertCircle, Copy,
  List, ListOrdered, Quote, Link, Image, Heading1, Heading2, Heading3,
  FileText, ExternalLink, Link as LinkIcon, X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NoteLinkMenu } from './NoteLinkMenu';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { motion } from 'framer-motion';
import { LinkedNotes } from './LinkedNotes';

interface NoteEditorProps {
  note: NoteThread;
  onUpdate: (note: NoteThread) => void;
  initialContent: string;
  allNotes: NoteThread[];
  onNavigateBack?: () => void;
  navigationStack: string[];
  onLinkNotes?: (sourceNoteId: string, targetNoteId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
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
}) => {
  const [content, setContent] = useState(note.content);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [showLinkedNotes, setShowLinkedNotes] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.name);

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
      icon: <FileText className="h-4 w-4" />,
      label: 'Wiki Link',
      action: handleWikiLinkTrigger,
      shortcut: '⌘L'
    },
    {
      icon: <LinkIcon className="h-4 w-4" />,
      label: 'Link Note',
      action: () => setShowLinkMenu(true),
      shortcut: '⌘L'
    }
  ];

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

      {/* Toolbar */}
      {viewMode === 'edit' && (
        <div className="border-b border-border px-2 py-1">
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

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <div className="flex-1 flex flex-col">
            {viewMode === 'edit' ? (
              <div className="h-full relative">
                <CodeEditor
                  value={content}
                  onChange={(e) => handleChange(e.target.value)}
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

          {/* Linked Notes Panel */}
          {showLinkedNotes && (
            <LinkedNotes
              currentNote={note}
              allNotes={allNotes}
              onNavigateToNote={onNavigateToNote || (() => {})}
            />
          )}
        </div>
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
              }}
              onClose={() => setShowLinkMenu(false)}
              currentNoteId={note.id}
            />
          </div>
        </div>
      )}
    </div>
  );
};