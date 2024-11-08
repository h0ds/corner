import React, { useEffect, useState, useCallback } from 'react';
import { NoteThread } from '@/types';
import { Bold, Italic, List, ListOrdered, Quote, Eye, Code, Strikethrough, Heading1, Heading2, Heading3, CheckSquare, Minus, Table } from 'lucide-react';
import { cn } from '@/lib/utils';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { type TokenizerAndRendererExtension } from 'marked';

interface NoteEditorProps {
  note: NoteThread;
  onUpdate: (content: string) => void;
  initialContent: string;
  allNotes: NoteThread[];
  onNavigateBack?: () => void;
  navigationStack?: string[];
}

const MenuBar: React.FC<{ 
  onInsertMarkdown: (markdown: string) => void,
  isPreview: boolean,
  onTogglePreview: () => void,
  onNavigateBack?: () => void,
  showBackButton?: boolean,
}> = ({ 
  onInsertMarkdown,
  isPreview,
  onTogglePreview,
  onNavigateBack,
  showBackButton,
}) => {
  return (
    <div className="border-b border-border p-2 flex items-center justify-between h-[40px]">
      <div className="flex items-center gap-1">
        {/* Text Formatting */}
        <button
          onClick={() => onInsertMarkdown('**')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
          <span className="sr-only">Bold</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('*')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
          <span className="sr-only">Italic</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('~~')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
          <span className="sr-only">Strikethrough</span>
        </button>

        <div className="w-px h-4 bg-border mx-1" /> {/* Separator */}

        {/* Headers */}
        <button
          onClick={() => onInsertMarkdown('# ')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
          <span className="sr-only">H1</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('## ')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
          <span className="sr-only">H2</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('### ')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
          <span className="sr-only">H3</span>
        </button>

        <div className="w-px h-4 bg-border mx-1" /> {/* Separator */}

        {/* Lists */}
        <button
          onClick={() => onInsertMarkdown('- ')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
          <span className="sr-only">Bullet List</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('1. ')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
          <span className="sr-only">Numbered List</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('- [ ] ')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Task List"
        >
          <CheckSquare className="h-4 w-4" />
          <span className="sr-only">Task List</span>
        </button>

        <div className="w-px h-4 bg-border mx-1" /> {/* Separator */}

        {/* Block Elements */}
        <button
          onClick={() => onInsertMarkdown('> ')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
          <span className="sr-only">Quote</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('```\n')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Code Block"
        >
          <Code className="h-4 w-4" />
          <span className="sr-only">Code Block</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('---\n')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
          <span className="sr-only">Horizontal Rule</span>
        </button>
        <button
          onClick={() => onInsertMarkdown('| Column 1 | Column 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |')}
          className="p-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Table"
        >
          <Table className="h-4 w-4" />
          <span className="sr-only">Table</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {showBackButton && (
          <button
            onClick={onNavigateBack}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        )}
        <button
          onClick={onTogglePreview}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            isPreview 
              ? "bg-accent text-accent-foreground" 
              : "hover:bg-accent hover:text-accent-foreground"
          )}
          title="Toggle Preview"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">Preview</span>
        </button>
      </div>
    </div>
  );
};

export const NoteEditor: React.FC<NoteEditorProps> = ({ 
  note, 
  onUpdate,
  initialContent,
  allNotes,
  onNavigateBack,
  navigationStack = [],
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

  const handleTextClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const text = textarea.value;
    const cursorPosition = textarea.selectionStart;
    
    // Find any wiki-links that contain the cursor position
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    
    while ((match = wikiLinkRegex.exec(text)) !== null) {
      const linkStart = match.index;
      const linkEnd = linkStart + match[0].length;
      
      if (cursorPosition >= linkStart && cursorPosition <= linkEnd) {
        const noteName = match[1].trim();
        const targetNote = allNotes.find(n => n.name === noteName);
        
        if (targetNote) {
          e.preventDefault();
          // Switch to notes tab
          window.dispatchEvent(new CustomEvent('switch-tab', {
            detail: { tab: 'notes' }
          }));
          
          // Select the note
          window.dispatchEvent(new CustomEvent('select-note', {
            detail: { noteId: targetNote.id }
          }));
        }
        break;
      }
    }
  }, [allNotes]);

  // Show back button only if we have navigation history
  const showBackButton = navigationStack.length > 0;

  // Define the renderer with proper typing
  const renderer = new marked.Renderer();

  // Override renderer methods
  Object.assign(renderer, {
    heading(text: string, level: number) {
      const sizes = {
        1: 'text-4xl font-bold',
        2: 'text-3xl font-bold',
        3: 'text-2xl font-bold',
        4: 'text-xl font-bold',
        5: 'text-lg font-bold',
        6: 'text-base font-bold'
      };
      const className = sizes[level as keyof typeof sizes] || sizes[6];
      return `<h${level} class="mt-6 mb-4 first:mt-0 ${className}">${text}</h${level}>`;
    },

    list(text: string, ordered: boolean, start: number) {
      const type = ordered ? 'ol' : 'ul';
      const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
      const classes = text.includes('task-list-item') 
        ? 'list-none pl-0 space-y-2 my-4' 
        : ordered 
          ? 'list-decimal pl-6 space-y-2 my-4'
          : 'list-disc pl-6 space-y-2 my-4';
      return `<${type}${startAttr} class="${classes}">${text}</${type}>`;
    },

    listitem(text: string, task: boolean, checked: boolean) {
      if (task) {
        return `
          <li class="task-list-item flex items-start gap-2">
            <input type="checkbox" ${checked ? 'checked' : ''} disabled class="mt-1.5" />
            <span>${text}</span>
          </li>
        `;
      }
      return `<li class="leading-relaxed">${text}</li>`;
    },

    paragraph(text: string) {
      return `<p class="mb-4 leading-relaxed">${text}</p>`;
    },

    blockquote(quote: string) {
      return `<blockquote class="pl-4 border-l-4 border-border italic my-4 text-muted-foreground">${quote}</blockquote>`;
    },

    table(header: string, body: string) {
      return `
        <div class="my-4 w-full overflow-x-auto">
          <table class="w-full border-collapse border border-border">
            <thead class="bg-muted">
              ${header}
            </thead>
            <tbody class="divide-y divide-border">
              ${body}
            </tbody>
          </table>
        </div>
      `;
    },

    tablerow(content: string) {
      return `<tr class="divide-x divide-border">${content}</tr>`;
    },

    tablecell(content: string, flags: { header: boolean }) {
      const tag = flags.header ? 'th' : 'td';
      const classes = flags.header 
        ? 'px-4 py-2 text-left font-medium'
        : 'px-4 py-2 text-left';
      return `<${tag} class="${classes}">${content}</${tag}>`;
    },

    code(code: string, language: string | undefined) {
      return `
        <div class="relative group my-4">
          <pre class="bg-[#282c34] rounded-md p-4 overflow-x-auto">
            <code class="text-sm font-mono text-white">${code}</code>
          </pre>
          <button 
            onclick="navigator.clipboard.writeText(\`${code.replace(/`/g, '\\`')}\`)"
            class="absolute right-2 top-2 p-1.5 rounded-md bg-white/10 opacity-0 
                   group-hover:opacity-100 transition-opacity hover:bg-white/20"
          >
            <svg class="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        </div>
      `;
    },

    link(href: string, title: string | null, text: string) {
      // Check if this is a wiki-style link
      const wikiLinkMatch = text.match(/^\[\[(.+?)\]\]$/);
      if (wikiLinkMatch) {
        const linkText = wikiLinkMatch[1];
        return `<span class="wiki-link cursor-pointer text-primary underline decoration-primary decoration-dotted underline-offset-4 hover:text-primary/80 transition-colors" data-name="${linkText}">${linkText}</span>`;
      }

      // Regular link
      return `<a href="${href}" ${title ? `title="${title}"` : ''} target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors">${text}</a>`;
    },
  });

  // Define the wiki-link extension with proper typing
  const wikiLinkExtension: TokenizerAndRendererExtension = {
    name: 'wikiLink',
    level: 'inline',
    start(src: string) {
      return src.indexOf('[[');
    },
    tokenizer(src: string) {
      const rule = /^\[\[([^\]]+)\]\]/;
      const match = rule.exec(src);
      if (match) {
        return {
          type: 'wikiLink',
          raw: match[0],
          text: match[1].trim(),
          tokens: []
        };
      }
      return undefined;
    },
    renderer(token) {
      return `<span class="wiki-link cursor-pointer text-primary underline decoration-primary decoration-dotted underline-offset-4 hover:text-primary/80 transition-colors" data-name="${token.text}">${token.text}</span>`;
    }
  };

  // Configure marked
  marked.setOptions({
    gfm: true,
    breaks: true,
    renderer: renderer
  });

  // Add the wiki-link extension
  marked.use({ extensions: [wikiLinkExtension] });

  const renderPreview = () => {
    if (!content) return null;
    try {
      // Replace wiki-links with proper markdown links before parsing
      const processedContent = content.replace(
        /\[\[(.+?)\]\]/g, 
        (_, name) => `[${name}](#${name})`
      );

      // Ensure marked returns a string by using Promise.resolve()
      const html = marked.parse(processedContent);
      
      // Wait for the HTML string if it's a promise
      const sanitizedHtml = DOMPurify.sanitize(html.toString(), {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'del', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'code', 'pre', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'input', 'span', 'div', 'button', 'svg', 'path'
        ],
        ALLOWED_ATTR: [
          'href', 'class', 'style', 'data-wikilink', 'type', 'checked', 'disabled',
          'onclick', 'viewBox', 'fill', 'stroke', 'stroke-width', 'd'
        ],
        ADD_ATTR: ['target'],
        FORCE_BODY: true,
        SANITIZE_DOM: true,
        ALLOW_DATA_ATTR: true
      });

      return (
        <div 
          className="prose prose-sm dark:prose-invert max-w-none p-4 selectable-text"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      );
    } catch (error) {
      console.error('Markdown rendering error:', error);
      return (
        <div className="p-4 space-y-2">
          <div className="text-sm font-medium text-destructive">
            Error rendering markdown
          </div>
          <div className="text-xs text-muted-foreground font-mono whitespace-pre-wrap bg-muted p-2 rounded-md">
            {error instanceof Error ? error.message : String(error)}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <MenuBar 
        onInsertMarkdown={insertMarkdown}
        isPreview={isPreview}
        onTogglePreview={() => setIsPreview(prev => !prev)}
        onNavigateBack={onNavigateBack}
        showBackButton={showBackButton}
      />
      <div className="flex-1 relative min-h-0">
        <textarea
          value={content}
          onChange={handleChange}
          onClick={handleTextClick}
          className={cn(
            "w-full h-full p-4 bg-transparent border-none focus:outline-none resize-none font-mono",
            "absolute inset-0",
            isPreview && "hidden"
          )}
          placeholder="Start writing in markdown..."
          spellCheck="false"
        />
        {showNoteSuggestions && noteSuggestions.length > 0 && (
          <div className="absolute z-10 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-md shadow-none">
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
          <div className="absolute inset-0 overflow-y-auto bg-background">
            {renderPreview()}
          </div>
        )}
      </div>
    </div>
  );
}; 