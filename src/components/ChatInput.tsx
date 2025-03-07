import React, { useState, useRef, useEffect } from 'react';
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
import cn from 'classnames';

interface ChatInputProps {
  onSendMessage: (message: string, overrideModel?: string) => void;
  onCompareModels: (message: string, model1: string, model2: string) => void;
  onStartDiscussion: (message: string, model1: string, model2: string) => void;
  onStopDiscussion: () => void;
  onClearThread: () => void;
  disabled: boolean;
  selectedModel: string;
  isDiscussing: boolean;
  isPaused: boolean;
  allThreads: Thread[];
  currentThreadId: string;
  onUpdateThreads: (threads: Thread[]) => void;
  onShowLinkedItems?: (items: any[]) => void;
  setInputValue?: (value: string) => void;
  initialValue?: string;
  selectedCommand?: string | null;
  onSelectCommand?: (command: string | null) => void;
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
  setInputValue,
  initialValue = "",
  selectedCommand,
  onSelectCommand,
}) => {
  const [message, setMessage] = useState(initialValue);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [commandQuery, setCommandQuery] = useState<string | null>(null);
  const [commandStartIndex, setCommandStartIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [showReferenceMenu, setShowReferenceMenu] = useState(false);
  const [referenceQuery, setReferenceQuery] = useState('');
  const [referenceStartIndex, setReferenceStartIndex] = useState<number | null>(null);

  useEffect(() => {
    setMessage(initialValue);
  }, [initialValue]);

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
              onSelectCommand?.(null);
            }
            return;
          }
        }
      }
      
      // No valid model mention found
      if (selectedCommand === 'compare' || selectedCommand === 'discuss') {
        toast({
          variant: "destructive",
          description: `Please mention a model to ${selectedCommand} with (e.g. @GPT-4)`,
          duration: 2000,
        });
        return;
      }

      // Handle other commands or send normally
      if (selectedCommand) {
        console.log('Submit - Executing command without model mention');
        handleCommandExecute(selectedCommand, message.trim());
      } else {
        console.log('Submit - Sending normal message');
        onSendMessage(message.trim());
      }
      setMessage('');
      onSelectCommand?.(null);
    }
  };

  const deactivateCommand = () => {
    onSelectCommand?.(null);
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
    if (setInputValue) {
      setInputValue(newValue);
    }

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
        onSelectCommand?.('compare');
        break;
      case 'discuss':
        onSelectCommand?.('discuss');
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

    if (!mentionedModelId) {
      toast({
        variant: "destructive",
        description: `Please mention a model to ${command} with (e.g. @GPT-4)`,
        duration: 2000,
      });
      return;
    }

    // Ensure both models are valid
    const model1 = AVAILABLE_MODELS.find(m => m.id === mentionedModelId);
    const model2 = AVAILABLE_MODELS.find(m => m.id === selectedModel);

    if (!model1 || !model2) {
      toast({
        variant: "destructive",
        description: "Invalid model selection",
        duration: 2000,
      });
      return;
    }

    switch (command) {
      case 'compare':
        if (onCompareModels) {
          console.log('Executing compare with:', {
            message,
            model1: mentionedModelId,
            model2: selectedModel
          });
          onCompareModels(message, mentionedModelId, selectedModel);
          onSelectCommand?.(null);
        }
        break;
      case 'discuss':
        if (onStartDiscussion) {
          console.log('Starting discussion with:', {
            message,
            model1: mentionedModelId,
            model2: selectedModel
          });
          onStartDiscussion(message, mentionedModelId, selectedModel);
          onSelectCommand?.(null);
        }
        break;
    }
  };

  const handleReferenceSelect = (thread: Thread) => {
    if (thread.isNote && allThreads && onUpdateThreads) {
      try {
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
        showToast({
          title: "Success",
          description: "Note linked successfully",
        });
      } catch (err) {
        console.error('Error linking note:', err);
        showToast({
          title: "Error",
          description: "Failed to link note",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="relative">
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
      <form onSubmit={handleSubmit} className="flex gap-1 w-full">
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
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                type="text"
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
                className={cn(
                  "pr-16",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              />
              <Button
                type="submit"
                size="icon"
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6",
                  !message.trim() && "opacity-50"
                )}
                disabled={!message.trim() || disabled}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
