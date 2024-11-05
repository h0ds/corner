import React, { useEffect, useState, useCallback } from 'react';
import { NoteThread } from '@/types';
import { Bold, Italic, List, ListOrdered, Quote, Hash, Eye, Code, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import { marked } from 'marked';

interface NoteEditorProps {
  note: NoteThread;
  onUpdate: (content: string) => void;
  initialContent: string;
  allNotes: NoteThread[];
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
        {/* ... other buttons stay the same ... */}
        <button
          onClick={() => onInsertMarkdown('[[', true)}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Link className="h-4 w-4" />
          <span className="sr-only">Note Link</span>
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
  allNotes,
}) => {
  const [content, setContent] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [showNoteSuggestions, setShowNoteSuggestions] = useState(false);
  const [noteSuggestions, setNoteSuggestions] = useState<NoteThread[]>([]);
  const [linkStartIndex, setLinkStartIndex] = useState<number | null>(null);

  useEffect(() => {
    if (note.createdAt === note.updatedAt) {
      setContent('');
    } else {
      setContent(note.content || '');
    }
  }, [note.id]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onUpdate(newContent);

    // Handle wiki-link suggestions
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newContent.slice(0, cursorPos);
    const wikiLinkMatch = textBeforeCursor.match(/\[\[([^\]]*?)$/);

    if (wikiLinkMatch) {
      const searchTerm = wikiLinkMatch[1].toLowerCase();
      const suggestions = allNotes
        .filter(n => n.id !== note.id && n.name.toLowerCase().includes(searchTerm))
        .slice(0, 5);

      setNoteSuggestions(suggestions);
      setShowNoteSuggestions(true);
      setLinkStartIndex(wikiLinkMatch.index || 0);
    } else {
      setShowNoteSuggestions(false);
      setLinkStartIndex(null);
    }
  }, [onUpdate, allNotes, note.id]);

  const insertMarkdown = useCallback((markdown: string, isWikiLink = false) => {
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

    if (isWikiLink) {
      // Show suggestions for all notes
      const suggestions = allNotes
        .filter(n => n.id !== note.id)
        .slice(0, 5);
      setNoteSuggestions(suggestions);
      setShowNoteSuggestions(true);
      setLinkStartIndex(start);
      
      newText = before + '[[' + selection + after;
      newCursorPos = start + 2;
    } else {
      // Handle other markdown
      if (markdown === '*' || markdown === '**') {
        if (selection) {
          newText = before + markdown + selection + markdown + after;
          newCursorPos = start + selection.length + (markdown.length * 2);
        } else {
          newText = before + markdown + after;
          newCursorPos = start + markdown.length;
        }
      } else {
        const isStartOfLine = start === 0 || text[start - 1] === '\n';
        if (!isStartOfLine) {
          newText = before + '\n' + markdown + selection + after;
          newCursorPos = start + markdown.length + 1;
        } else {
          newText = before + markdown + selection + after;
          newCursorPos = start + markdown.length;
        }
      }
    }

    setContent(newText);
    onUpdate(newText);

    setTimeout(() => {
      textArea.focus();
      textArea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [onUpdate, allNotes, note.id]);

  const insertNoteLink = useCallback((noteName: string) => {
    if (linkStartIndex === null) return;

    const textArea = document.querySelector('textarea');
    if (!textArea) return;

    const before = content.slice(0, linkStartIndex);
    const after = content.slice(textArea.selectionStart);
    const newContent = `${before}[[${noteName}]]${after}`;

    setContent(newContent);
    onUpdate(newContent);
    setShowNoteSuggestions(false);
    setLinkStartIndex(null);

    const newCursorPos = linkStartIndex + noteName.length + 4;
    setTimeout(() => {
      textArea.focus();
      textArea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content, linkStartIndex, onUpdate]);

  const renderMarkdown = useCallback((text: string) => {
    try {
      return marked(text || '');
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return '<div class="text-red-500">Error parsing markdown</div>';
    }
  }, []);

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('wiki-link')) {
      e.preventDefault();
      const noteName = target.getAttribute('data-name');
      if (noteName) {
        const targetNote = allNotes.find(n => n.name === noteName);
        if (targetNote) {
          // Switch to notes tab
          window.dispatchEvent(new CustomEvent('switch-tab', {
            detail: { tab: 'notes' }
          }));
          
          // Select the note
          window.dispatchEvent(new CustomEvent('select-note', {
            detail: { noteId: targetNote.id }
          }));
        }
      }
    }
  }, [allNotes]);

  return (
    <div className="flex flex-col flex-1 bg-background">
      <MenuBar 
        onInsertMarkdown={insertMarkdown}
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview(prev => !prev)}
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
        {showNoteSuggestions && noteSuggestions.length > 0 && (
          <div className="absolute z-10 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-sm shadow-md">
            {noteSuggestions.map(note => (
              <button
                key={note.id}
                onClick={() => insertNoteLink(note.name)}
                className="w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
              >
                {note.name}
              </button>
            ))}
          </div>
        )}
        {isPreview && (
          <div 
            className="prose prose-sm dark:prose-invert max-w-none p-4 overflow-auto h-full"
            dangerouslySetInnerHTML={{ __html: marked(content || '') }}
            onClick={handlePreviewClick}
          />
        )}
      </div>
      <style>{`
        .prose {
          max-width: none;
          width: 100%;
        }
        .prose h1 {
          font-size: 2rem;
          line-height: 2.5rem;
          margin: 2rem 0 1rem;
          font-weight: 600;
        }
        .prose h2 {
          font-size: 1.5rem;
          line-height: 2rem;
          margin: 1.5rem 0 0.75rem;
          font-weight: 600;
        }
        .prose h3 {
          font-size: 1.25rem;
          line-height: 1.75rem;
          margin: 1.25rem 0 0.75rem;
          font-weight: 600;
        }
        .prose h4 {
          font-size: 1.125rem;
          line-height: 1.75rem;
          margin: 1.25rem 0 0.5rem;
          font-weight: 600;
        }
        .prose h5, .prose h6 {
          font-size: 1rem;
          line-height: 1.5rem;
          margin: 1rem 0 0.5rem;
          font-weight: 600;
        }
        .prose h1:first-child,
        .prose h2:first-child,
        .prose h3:first-child,
        .prose h4:first-child,
        .prose h5:first-child,
        .prose h6:first-child {
          margin-top: 0;
        }
        .prose p {
          margin: 0.75em 0;
          line-height: 1.6;
        }
        .prose blockquote {
          margin: 1.5em 0;
          padding: 0.5em 0 0.5em 1.5em;
          border-left: 2px solid var(--primary);
          font-style: italic;
          color: var(--muted-foreground);
          background: var(--accent);
          border-radius: 0 0.25rem 0.25rem 0;
        }
        .prose blockquote p {
          margin: 0.5em 0;
        }
        .prose blockquote p:first-child {
          margin-top: 0;
        }
        .prose blockquote p:last-child {
          margin-bottom: 0;
        }
        .prose ul, .prose ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
        }
        .prose ul {
          list-style-type: disc;
        }
        .prose ol {
          list-style-type: decimal;
        }
        .prose li {
          margin: 0.25em 0;
          padding-left: 0.5em;
        }
        .prose li::marker {
          color: var(--muted-foreground);
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
          font-family: var(--font-mono);
        }
        .prose pre code {
          background: none;
          padding: 0;
          border-radius: 0;
        }
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        .prose hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 2em 0;
        }
        .prose .wiki-link {
          color: var(--primary);
          text-decoration: none;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          background: var(--accent);
          font-weight: 500;
          cursor: pointer;
        }
        .prose .wiki-link:hover {
          background: var(--accent-foreground);
          color: var(--background);
        }
      `}</style>
    </div>
  );
}; 