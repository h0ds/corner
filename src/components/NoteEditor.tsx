import React, { useEffect, useState, useCallback } from 'react';
import { NoteThread } from '@/types';
import { Bold, Italic, List, ListOrdered, Quote, Hash, Eye, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { marked } from 'marked';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface NoteEditorProps {
  note: NoteThread;
  onUpdate: (content: string) => void;
  initialContent: string;
  allNotes: NoteThread[];
  onFileClick: (file: any) => void;
  files: any[];
  onCreateNote: (title: string) => NoteThread;
}

const MenuBar: React.FC<{ 
  onInsertMarkdown: (markdown: string) => void,
  isPreview: boolean,
  onTogglePreview: () => void,
}> = ({ 
  onInsertMarkdown,
  isPreview,
  onTogglePreview,
}) => {
  return (
    <div className="border-b border-border p-2 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onInsertMarkdown('**')}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Bold className="h-4 w-4" />
          <span className="sr-only">Bold</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('*')}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Italic className="h-4 w-4" />
          <span className="sr-only">Italic</span>
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={() => onInsertMarkdown('# ')}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Hash className="h-4 w-4" />
          <span className="sr-only">Heading</span>
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={() => onInsertMarkdown('* ')}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <List className="h-4 w-4" />
          <span className="sr-only">Bullet List</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('1. ')}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ListOrdered className="h-4 w-4" />
          <span className="sr-only">Numbered List</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('> ')}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Quote className="h-4 w-4" />
          <span className="sr-only">Quote</span>
        </button>
      </div>
      <button
        onClick={onTogglePreview}
        className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        {isPreview ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        <span className="sr-only">{isPreview ? 'Show Editor' : 'Show Preview'}</span>
      </button>
    </div>
  );
};

export const NoteEditor: React.FC<NoteEditorProps> = ({ 
  note, 
  onUpdate,
  initialContent,
}) => {
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  // Update content when note changes
  useEffect(() => {
    // For new notes, use empty content
    if (!note.content && note.createdAt === note.updatedAt) {
      setContent('');
    } else {
      setContent(note.content || '');
    }
  }, [note.id]); // Only depend on note.id to prevent unnecessary updates

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onUpdate(newContent);
  };

  const insertMarkdown = useCallback((markdown: string) => {
    const textArea = document.querySelector('textarea');
    if (!textArea) return;

    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;
    const text = textArea.value;
    
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    let newText;
    let newCursorPos;

    if (markdown === '*' || markdown === '**') {
      // For italic and bold
      if (selection) {
        newText = before + markdown + selection + markdown + after;
        newCursorPos = start + selection.length + (markdown.length * 2);
      } else {
        newText = before + markdown + after;
        newCursorPos = start + markdown.length;
      }
    } else {
      // For lists, quotes, and headings
      const isStartOfLine = start === 0 || text[start - 1] === '\n';
      if (!isStartOfLine) {
        newText = before + '\n' + markdown + selection + after;
        newCursorPos = start + markdown.length + 1;
      } else {
        newText = before + markdown + selection + after;
        newCursorPos = start + markdown.length;
      }
    }

    setContent(newText);
    onUpdate(newText);

    // Set cursor position
    setTimeout(() => {
      textArea.focus();
      textArea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [onUpdate]);

  const togglePreview = useCallback(() => {
    setIsPreview(prev => !prev);
  }, []);

  return (
    <div className="flex flex-col flex-1 bg-background">
      <MenuBar 
        onInsertMarkdown={insertMarkdown}
        isPreview={isPreview}
        onTogglePreview={togglePreview}
      />
      <div className="relative flex-1">
        <textarea
          value={content}
          onChange={handleChange}
          className={cn(
            "w-full h-full p-4 bg-transparent border-none focus:outline-none resize-none font-mono",
            isPreview && "hidden"
          )}
          style={{ 
            minHeight: '200px',
            color: 'inherit',
            lineHeight: '1.5'
          }}
          placeholder="Start writing in markdown..."
          spellCheck="false"
        />
        {isPreview && (
          <div 
            className="prose prose-sm dark:prose-invert max-w-none p-4 overflow-auto h-full"
            dangerouslySetInnerHTML={{ __html: marked(content) }}
          />
        )}
      </div>
      <style>{`
        .prose {
          max-width: none;
          width: 100%;
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
        }
        .prose h1:first-child, .prose h2:first-child, .prose h3:first-child {
          margin-top: 0;
        }
        .prose p {
          margin-top: 0.75em;
          margin-bottom: 0.75em;
        }
        .prose ul, .prose ol {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          padding-left: 1.5em;
        }
        .prose li {
          margin-top: 0.25em;
          margin-bottom: 0.25em;
        }
        .prose a {
          color: var(--primary);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .prose a:hover {
          text-decoration-thickness: 2px;
        }
        .prose pre {
          background: var(--accent);
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1em 0;
        }
        .prose code {
          background: var(--accent);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        .prose pre code {
          background: none;
          padding: 0;
          border-radius: 0;
        }
        .prose blockquote {
          border-left: 2px solid var(--border);
          padding-left: 1em;
          margin: 1em 0;
          font-style: italic;
          color: var(--muted-foreground);
        }
      `}</style>
    </div>
  );
}; 