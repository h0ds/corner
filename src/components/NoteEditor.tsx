import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect, useState, useCallback } from 'react';
import { NoteThread } from '@/types';
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo, Hash, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileLinkMenu } from './FileLinkMenu';
import { CustomLink } from '@/lib/extensions/CustomLink';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { getMarkRange } from '@tiptap/core';

interface NoteEditorProps {
  note: NoteThread;
  onUpdate: (content: string) => void;
  initialContent: string;
  allNotes: NoteThread[];
  onFileClick: (file: any) => void;
  files: any[];
  onCreateNote: (title: string) => NoteThread;
}

const NoteLink = Extension.create({
  name: 'noteLink',

  addOptions() {
    return {
      openOnClick: true,
      allNotes: [] as NoteThread[],
      onNoteClick: (noteId: string) => {},
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('noteLink-click'),
        props: {
          handleClick: (view, pos, event) => {
            const { state } = view;
            const { schema, doc } = state;
            const range = getMarkRange(doc.resolve(pos), schema.marks.link);
            
            if (!range) return false;
            
            const $start = doc.resolve(range.from);
            const link = $start.marks().find(mark => mark.type.name === 'link');
            
            if (!link) return false;
            
            const type = link.attrs['data-type'];
            const name = link.attrs['data-name'];
            
            if (type === 'note') {
              const targetNote = this.options.allNotes.find(n => n.name === name);
              if (targetNote) {
                window.dispatchEvent(new CustomEvent('switch-tab', {
                  detail: { tab: 'notes' }
                }));
                
                window.dispatchEvent(new CustomEvent('select-note', {
                  detail: { noteId: targetNote.id }
                }));
                return true;
              }
            }
            return false;
          },
        },
      }),
    ]
  },
});

const MenuBar: React.FC<{ 
  editor: any,
  onCreateLink: () => void,
}> = ({ 
  editor,
  onCreateLink,
}) => {
  if (!editor) return null;

  return (
    <div className="border-b border-border p-2 flex items-center justify-between">
      <div className="flex items-center gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors group relative"
        >
          <Bold className="h-4 w-4" />
          <span className="sr-only">Bold</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover 
                       text-popover-foreground text-xs rounded-sm opacity-0 group-hover:opacity-100 
                       transition-opacity whitespace-nowrap border border-border">
            **bold**
          </span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors group relative"
        >
          <Italic className="h-4 w-4" />
          <span className="sr-only">Italic</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover 
                       text-popover-foreground text-xs rounded-sm opacity-0 group-hover:opacity-100 
                       transition-opacity whitespace-nowrap border border-border">
            *italic*
          </span>
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors group relative"
        >
          <Hash className="h-4 w-4" />
          <span className="sr-only">Heading</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover 
                       text-popover-foreground text-xs rounded-sm opacity-0 group-hover:opacity-100 
                       transition-opacity whitespace-nowrap border border-border">
            # Heading
          </span>
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors group relative"
        >
          <List className="h-4 w-4" />
          <span className="sr-only">Bullet List</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover 
                       text-popover-foreground text-xs rounded-sm opacity-0 group-hover:opacity-100 
                       transition-opacity whitespace-nowrap border border-border">
            * list item
          </span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors group relative"
        >
          <ListOrdered className="h-4 w-4" />
          <span className="sr-only">Numbered List</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover 
                       text-popover-foreground text-xs rounded-sm opacity-0 group-hover:opacity-100 
                       transition-opacity whitespace-nowrap border border-border">
            1. numbered list
          </span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors group relative"
        >
          <Quote className="h-4 w-4" />
          <span className="sr-only">Quote</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover 
                       text-popover-foreground text-xs rounded-sm opacity-0 group-hover:opacity-100 
                       transition-opacity whitespace-nowrap border border-border">
            {'> quote'}
          </span>
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Undo className="h-4 w-4" />
          <span className="sr-only">Undo</span>
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Redo className="h-4 w-4" />
          <span className="sr-only">Redo</span>
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          onClick={onCreateLink}
          className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors group relative"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Connect Notes</span>
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-popover 
                       text-popover-foreground text-xs rounded-sm opacity-0 group-hover:opacity-100 
                       transition-opacity whitespace-nowrap border border-border">
            Connect notes
          </span>
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
  onFileClick,
  files,
  onCreateNote,
}) => {
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [linkQuery, setLinkQuery] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      CustomLink.configure({
        openOnClick: false,
        inclusive: false,
        selectable: false,
        HTMLAttributes: {
          class: 'cursor-pointer',
          contenteditable: 'false',
          draggable: 'false'
        }
      }),
      NoteLink.configure({
        allNotes,
        onNoteClick: (noteId) => {
          window.dispatchEvent(new CustomEvent('switch-tab', {
            detail: { tab: 'notes' }
          }));
          
          window.dispatchEvent(new CustomEvent('select-note', {
            detail: { noteId }
          }));
        }
      })
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none min-h-[200px] font-mono',
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        const link = target.closest('a');
        
        if (link) {
          event.preventDefault();
          const type = link.getAttribute('data-type');
          const name = link.getAttribute('data-name');
          
          if (type === 'note') {
            const targetNote = allNotes.find(n => n.name === name);
            if (targetNote) {
              window.dispatchEvent(new CustomEvent('switch-tab', {
                detail: { tab: 'notes' }
              }));
              
              window.dispatchEvent(new CustomEvent('select-note', {
                detail: { noteId: targetNote.id }
              }));
              return true;
            }
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onUpdate(content);
    },
  });

  useEffect(() => {
    if (editor) {
      setEditorInstance(editor);
    }
  }, [editor]);

  const handleCreateLink = useCallback(() => {
    setShowLinkMenu(true);
    setLinkQuery('');
  }, []);

  const handleLinkSelect = useCallback((name: string, type: 'file' | 'note') => {
    if (!editorInstance) return;

    const linkContent = `<a href="#" class="note-link" data-type="${type}" data-name="${name}">${name}</a> `;
    
    editorInstance
      .chain()
      .focus()
      .insertContent(linkContent)
      .run();

    setShowLinkMenu(false);
  }, [editorInstance]);

  useEffect(() => {
    if (editor && note.content) {
      editor.commands.setContent(note.content);
    }
  }, [editor, note.id, note.content]);

  return (
    <div className="flex flex-col flex-1 bg-background">
      <style>{`
        .ProseMirror .note-link {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          margin: 0 0.125rem;
          border-radius: 0.25rem;
          background-color: var(--muted);
          color: var(--muted-foreground);
          font-size: 0.875rem;
          line-height: 1;
          white-space: nowrap;
          text-decoration: none;
          cursor: pointer;
          transition: all 150ms ease;
          box-shadow: 
            0 1px 2px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          user-select: none;
          pointer-events: all;
          position: relative;
          -webkit-user-modify: read-only;
          -moz-user-modify: read-only;
          user-modify: read-only;
        }

        .ProseMirror .note-link:hover {
          background-color: var(--accent);
          color: var(--accent-foreground);
          transform: translateY(-1px);
          box-shadow: 
            0 2px 4px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .ProseMirror .note-link:active {
          transform: translateY(0);
          box-shadow: 
            0 1px 1px rgba(0, 0, 0, 0.1),
            inset 0 1px 1px rgba(0, 0, 0, 0.1);
        }

        .ProseMirror .note-link[data-type="note"]::before {
          content: '📝';
          margin-right: 0.25rem;
        }

        .ProseMirror .note-link[data-type="file"]::before {
          content: '📄';
          margin-right: 0.25rem;
        }
      `}</style>
      <MenuBar 
        editor={editor}
        onCreateLink={handleCreateLink}
      />
      <div className="relative flex-1">
        <FileLinkMenu
          query={linkQuery}
          files={files}
          notes={allNotes.filter(n => n.id !== note.id)}
          onSelect={handleLinkSelect}
          onClose={() => setShowLinkMenu(false)}
          open={showLinkMenu}
        />
        <EditorContent 
          editor={editor} 
          className="flex-1 overflow-y-auto"
        />
      </div>
    </div>
  );
}; 