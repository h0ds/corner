import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect } from 'react';
import { NoteThread } from '@/types';
import { Bold, Italic, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteEditorProps {
  note: NoteThread;
  onUpdate: (content: string) => void;
  initialContent: string;
}

const MenuBar: React.FC<{ editor: any }> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b border-border p-2 flex items-center gap-1">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={cn(
          "p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
          editor.isActive('bold') && 'bg-accent text-accent-foreground'
        )}
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={cn(
          "p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
          editor.isActive('italic') && 'bg-accent text-accent-foreground'
        )}
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          "p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
          editor.isActive('bulletList') && 'bg-accent text-accent-foreground'
        )}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          "p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
          editor.isActive('orderedList') && 'bg-accent text-accent-foreground'
        )}
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={cn(
          "p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
          editor.isActive('blockquote') && 'bg-accent text-accent-foreground'
        )}
      >
        <Quote className="h-4 w-4" />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Undo className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Redo className="h-4 w-4" />
      </button>
    </div>
  );
};

export const NoteEditor: React.FC<NoteEditorProps> = ({ 
  note, 
  onUpdate,
  initialContent 
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none p-4 focus:outline-none min-h-[200px]',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
  });

  // Update content when note changes
  useEffect(() => {
    if (editor && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content || '');
    }
  }, [editor, note.id, note.content]);

  return (
    <div className="flex flex-col flex-1 bg-background">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}; 