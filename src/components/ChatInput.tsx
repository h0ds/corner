import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Input } from './ui/input';
import { ModelMention } from './ModelMention';
import { CommandMenu } from './CommandMenu';
import { AVAILABLE_MODELS } from './ModelSelector';
import { exit } from '@tauri-apps/plugin-process';
import { useToast } from "@/hooks/use-toast";
import { ReferenceMenu } from './ReferenceMenu';
import { Thread } from '@/types';
import { showToast } from '@/lib/toast';

interface ChatInputProps {
  onSendMessage: (message: string, overrideModel?: string) => void;
  onCompareModels?: (message: string, model1: string, model2: string) => void;
  onStartDiscussion?: (message: string, model1: string, model2: string) => void;
  onStopDiscussion?: () => void;
  onClearThread?: () => void;
  disabled?: boolean;
  selectedModel: string;
  isDiscussing?: boolean;
  isPaused?: boolean;
  allThreads: Thread[];
  currentThreadId: string;
  onUpdateThreads?: (threads: Thread[]) => void;
  onShowLinkedItems?: (noteId: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onCompareModels,
  onStartDiscussion,
  onStopDiscussion,
  onClearThread,
  disabled,
  selectedModel,
  isDiscussing,
  isPaused,
  allThreads,
  currentThreadId,
  onUpdateThreads,
  onShowLinkedItems,
}) => {
  const [message, setMessage] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [commandQuery, setCommandQuery] = useState<string | null>(null);
  const [commandStartIndex, setCommandStartIndex] = useState<number | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [showReferenceMenu, setShowReferenceMenu] = useState(false);
  const [referenceQuery, setReferenceQuery] = useState('');
  const [referenceStartIndex, setReferenceStartIndex] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      console.log('Submit - Original message:', message);
      console.log('Submit - Selected command:', selectedCommand);

      // Extract model mention if present
      const parts = message.split('@');
      if (parts.length > 1) {
        // Get the part after @
        const afterMention = parts[1];
        // Find the first space after the mention
        const spaceIndex = afterMention.indexOf(' ');
        
        if (spaceIndex !== -1) {
          const mentionedModelId = afterMention.slice(0, spaceIndex).trim();
          const model = AVAILABLE_MODELS.find(m => m.id === mentionedModelId);
          
          console.log('Submit - Found mention:', {
            mentionedModelId,
            model,
            afterMention,
            spaceIndex
          });
          
          if (model) {
            // Get only the text after the space following the mention
            const cleanMessage = afterMention.slice(spaceIndex + 1).trim();
            
            console.log('Submit - Clean message:', cleanMessage);
            
            if (cleanMessage) {
              // If there's a selected command, execute it
              if (selectedCommand) {
                console.log('Submit - Executing command:', selectedCommand);
                handleCommandExecute(selectedCommand, cleanMessage, model.id);
              } else {
                // Otherwise send normally
                console.log('Submit - Sending normal message with model override');
                onSendMessage(cleanMessage, model.id);
              }
              setMessage('');
              setSelectedCommand(null);
            }
            return;
          }
        }
      }
      
      // No valid model mention, send normally
      if (selectedCommand) {
        console.log('Submit - Executing command without model mention');
        handleCommandExecute(selectedCommand, message.trim());
      } else {
        console.log('Submit - Sending normal message');
        onSendMessage(message.trim());
      }
      setMessage('');
      setSelectedCommand(null);
    }
  };

  const deactivateCommand = () => {
    setSelectedCommand(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null || commandQuery !== null) {
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
        return;
      }
    }

    // Handle escape key for both command deactivation and discussion stopping
    if (e.key === 'Escape') {
      e.preventDefault();
      if (selectedCommand) {
        deactivateCommand();
      } else if (isDiscussing && onStopDiscussion) {
        onStopDiscussion();
      }
      return;
    }

    if (e.key === '@') {
      setMentionStartIndex(e.currentTarget.selectionStart);
      setMentionQuery('');
      return;
    }

    if (e.key === '!') {
      setCommandStartIndex(e.currentTarget.selectionStart);
      setCommandQuery('');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);

    const currentPosition = e.target.selectionStart ?? 0;

    if (mentionStartIndex !== null) {
      const textAfterMention = newValue.slice(mentionStartIndex + 1, currentPosition);
      
      if (textAfterMention.includes(' ') || currentPosition <= mentionStartIndex) {
        setMentionQuery(null);
        setMentionStartIndex(null);
      } else {
        setMentionQuery(textAfterMention);
      }
    }

    if (commandStartIndex !== null) {
      const textAfterCommand = newValue.slice(commandStartIndex + 1, currentPosition);
      
      if (textAfterCommand.includes(' ') || currentPosition <= commandStartIndex) {
        setCommandQuery(null);
        setCommandStartIndex(null);
      } else {
        setCommandQuery(textAfterCommand);
      }
    }

    if (referenceStartIndex !== null) {
      const textAfterTrigger = newValue.slice(referenceStartIndex + 1, currentPosition);
      
      if (textAfterTrigger.includes(' ') || currentPosition <= referenceStartIndex) {
        setShowReferenceMenu(false);
        setReferenceQuery('');
        setReferenceStartIndex(null);
      } else {
        setReferenceQuery(textAfterTrigger);
      }
    }
  };

  const handleModelSelect = (modelId: string) => {
    if (mentionStartIndex === null) return;

    const before = message.slice(0, mentionStartIndex);
    const after = message.slice(mentionStartIndex + (mentionQuery?.length || 0) + 1);
    
    // Use modelId instead of name in the message text
    const newMessage = `${before}@${modelId} ${after}`;
    setMessage(newMessage);
    setMentionQuery(null);
    setMentionStartIndex(null);

    requestAnimationFrame(() => {
      if (inputRef.current) {
        const newPosition = mentionStartIndex + modelId.length + 2;
        inputRef.current.setSelectionRange(newPosition, newPosition);
        inputRef.current.focus();
      }
    });
  };

  const handleCommandSelect = async (commandId: string) => {
    if (commandStartIndex === null) return;

    // Remove the '!' and any command text from the message
    const before = message.slice(0, commandStartIndex);
    const after = message.slice(commandStartIndex + (commandQuery?.length || 0) + 1);
    const cleanMessage = (before + after).trim();
    setMessage(cleanMessage);

    switch (commandId) {
      case 'clear':
        if (onClearThread) {
          onClearThread();
          setMessage('');
        }
        break;
      case 'quit':
        await exit(0);
        break;
      case 'compare':
        setSelectedCommand('compare');
        break;
      case 'discuss':
        setSelectedCommand('discuss');
        break;
      case 'stop':
        if (onStopDiscussion) {
          onStopDiscussion();
          setMessage('');
        }
        break;
    }

    setCommandQuery(null);
    setCommandStartIndex(null);
  };

  const handleCommandExecute = (command: string, message: string, mentionedModelId?: string) => {
    console.log('CommandExecute:', {
      command,
      message,
      mentionedModelId,
      selectedModel
    });

    switch (command) {
      case 'compare':
        if (!mentionedModelId) {
          toast({
            variant: "destructive",
            description: "Please mention a model to compare with (e.g. @GPT-4)",
            duration: 2000,
          });
          return;
        }
        if (onCompareModels) {
          onCompareModels(message, mentionedModelId, selectedModel);
          setSelectedCommand(null);
        }
        break;
      case 'discuss':
        if (!mentionedModelId) {
          toast({
            variant: "destructive",
            description: "Please mention a model to discuss with (e.g. @GPT-4)",
            duration: 2000,
          });
          return;
        }
        if (onStartDiscussion) {
          onStartDiscussion(message, mentionedModelId, selectedModel);
          setSelectedCommand(null);
        }
        break;
    }
  };

  const handleReferenceSelect = (thread: Thread) => {
    if (thread.isNote && allThreads && onUpdateThreads) {
      showToast.promise(
        new Promise((resolve) => {
          const updatedThreads = allThreads.map(t => {
            if (t.id === thread.id) {
              const existingLinks = t.linkedNotes || [];
              if (!existingLinks.includes(currentThreadId)) {
                return {
                  ...t,
                  linkedNotes: [...existingLinks, currentThreadId],
                  updatedAt: Date.now(),
                };
              }
            }
            return t;
          });
          
          onUpdateThreads(updatedThreads);
          onShowLinkedItems?.(thread.id);
          resolve(true);
        }),
        {
          loading: 'Linking note...',
          success: `Linked to note: ${thread.name}`,
          error: 'Failed to link note'
        }
      );
    }
  };

  return (
    <div className="relative w-full">
      {mentionQuery !== null && (
        <ModelMention
          query={mentionQuery}
          onSelect={handleModelSelect}
          onClose={() => {
            setMentionQuery(null);
            setMentionStartIndex(null);
          }}
        />
      )}
      {commandQuery !== null && (
        <CommandMenu
          query={commandQuery}
          onSelect={handleCommandSelect}
          onClose={() => {
            setCommandQuery(null);
            setCommandStartIndex(null);
          }}
        />
      )}
      <form onSubmit={handleSubmit} className="flex gap-2 w-full">
        <div className="flex-1 flex flex-col gap-1">
          {selectedCommand && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="bg-accent-light px-1.5 py-0.5 rounded-xl">
                {selectedCommand}
              </span>
              <button
                type="button"
                onClick={deactivateCommand}
                className="hover:text-foreground"
              >
                (ESC to cancel)
              </button>
            </div>
          )}
          {isDiscussing && isPaused && (
            <div className="text-xs text-muted-foreground">
              Discussion paused - send a message to continue
            </div>
          )}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isDiscussing && isPaused 
                  ? "Send a message to continue the discussion..." 
                  : selectedCommand 
                    ? `Type a message to ${selectedCommand}...` 
                    : "Type a message"
              }
              disabled={disabled}
              className={`h-[35px] resize-none rounded-lg text-sm shadow-none
                       bg-background placeholder:text-muted-foreground/50 selectable-text selection:bg-palette-blue selection:text-white
                       ${selectedCommand ? 'border-primary' : ''}
                       ${isDiscussing && isPaused ? 'border-yellow-500' : ''}`}
            />
          </div>
        </div>
        <Button 
          type="submit" 
          disabled={disabled || !message.trim()}
          size="icon"
          className="rounded-lg shrink-0 h-[35px] w-[35px]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
      {selectedCommand === 'compare' && (
        <div className="absolute -top-8 left-0 text-xs text-muted-foreground">
          Mention a model to compare with the currently selected model (@model-name)
        </div>
      )}
      {selectedCommand === 'discuss' && (
        <div className="absolute -top-8 left-0 text-xs text-muted-foreground">
          Mention a model to start a discussion with the currently selected model (@model-name)
        </div>
      )}

      <ReferenceMenu
        query={referenceQuery}
        currentThreadId={currentThreadId}
        onSelect={handleReferenceSelect}
        onClose={() => {
          setShowReferenceMenu(false);
          setReferenceQuery('');
          setReferenceStartIndex(null);
        }}
        open={showReferenceMenu}
        onQueryChange={setReferenceQuery}
      />
    </div>
  );
};
