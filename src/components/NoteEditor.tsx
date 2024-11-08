import React, { useEffect, useState } from 'react';
import { NoteThread } from '@/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NoteEditorProps {
  note: NoteThread;
  onUpdate: (note: NoteThread) => void;
  initialContent: string;
  allNotes: NoteThread[];
  onNavigateBack?: () => void;
  navigationStack: string[];
}

const CACHE_PREFIX = 'note_cache_';
const CACHE_VERSION = 'v1'; // Increment this when making breaking changes to cache structure

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onUpdate,
  initialContent,
  onNavigateBack,
  navigationStack,
}) => {
  const [content, setContent] = useState<string>(
    typeof initialContent === 'string' ? initialContent : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(note.name);
  const cacheKey = `${CACHE_PREFIX}${CACHE_VERSION}_${note.id}`;

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <div className="flex items-center gap-2 w-full">
          {navigationStack.length > 1 && (
            <button
              onClick={onNavigateBack}
              className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          
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
                  "h-8 text-sm text-center font-medium",
                  "w-[200px]"
                )}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h1 
                className={cn(
                  "text-sm cursor-pointer hover:text-foreground/80",
                  "font-mono tracking-tighter leading-tighter",
                  "transition-colors"
                )}
                onDoubleClick={handleStartRename}
                title="Double click to edit name"
              >
                {note.name || 'Untitled Note'}
              </h1>
            )}
          </div>

          {/* Empty div for right side balance */}
          <div className="w-8" />
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

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <MDEditor
          value={typeof content === 'string' ? content : ''}
          onChange={(val) => handleChange(val)}
          preview="live"
          className={cn(
            "w-full h-full border-none",
            // Override default styles
            "[&_.w-md-editor-text-pre]:!bg-transparent",
            "[&_.w-md-editor-text-input]:!bg-transparent",
            "[&_.w-md-editor-text]:!bg-transparent",
            "[&_.wmde-markdown-var]:!bg-transparent",
            // Remove default borders
            "[&_.w-md-editor-toolbar]:!border-0",
            "[&_.w-md-editor-toolbar]:!bg-transparent",
            "[&_.w-md-editor-preview]:!bg-transparent"
          )}
          height="100%"
          textareaProps={{
            placeholder: 'Start writing...'
          }}
        />
      </div>
    </div>
  );
}; 