import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Input } from './ui/input';
import { ModelMention } from './ModelMention';
import { CommandMenu } from './CommandMenu';
import { AVAILABLE_MODELS } from './ModelSelector';
import { exit } from '@tauri-apps/plugin-process';
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  onSendMessage: (message: string, overrideModel?: string) => void;
  onCompareModels?: (message: string, model1: string, model2: string) => void;
  onClearThread?: () => void;
  disabled?: boolean;
  selectedModel: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onCompareModels,
  onClearThread,
  disabled,
  selectedModel 
}) => {
  const [message, setMessage] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [commandQuery, setCommandQuery] = useState<string | null>(null);
  const [commandStartIndex, setCommandStartIndex] = useState<number | null>(null);
  const [selectedCommand, setSelectedCommand] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

    if (e.key === 'Escape' && selectedCommand) {
      e.preventDefault();
      deactivateCommand();
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
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);

    if (mentionStartIndex !== null) {
      const currentPosition = e.target.selectionStart;
      const textAfterMention = newValue.slice(mentionStartIndex + 1, currentPosition);
      
      if (textAfterMention.includes(' ') || currentPosition <= mentionStartIndex) {
        setMentionQuery(null);
        setMentionStartIndex(null);
      } else {
        setMentionQuery(textAfterMention);
      }
    }

    if (commandStartIndex !== null) {
      const currentPosition = e.target.selectionStart;
      const textAfterCommand = newValue.slice(commandStartIndex + 1, currentPosition);
      
      if (textAfterCommand.includes(' ') || currentPosition <= commandStartIndex) {
        setCommandQuery(null);
        setCommandStartIndex(null);
      } else {
        setCommandQuery(textAfterCommand);
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
        // Store the command
        setSelectedCommand('compare');
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
          console.log('Executing compare with:', {
            message,
            model1: mentionedModelId,
            model2: selectedModel
          });
          onCompareModels(message, mentionedModelId, selectedModel);
          setSelectedCommand(null); // Clear the command after execution
        } else {
          console.error('onCompareModels not provided');
        }
        break;
      // Add other command executions here
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
              <span className="bg-accent/50 px-1.5 py-0.5 rounded-sm">
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
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={selectedCommand ? `Type a message to ${selectedCommand}...` : "Type a message"}
              disabled={disabled}
              className={`h-[35px] resize-none rounded-sm text-sm 
                       bg-background placeholder:text-muted-foreground selectable-text
                       ${selectedCommand ? 'border-primary' : ''}`}
            />
          </div>
        </div>
        <Button 
          type="submit" 
          disabled={disabled || !message.trim()}
          size="icon"
          className="rounded-sm shrink-0 h-[35px]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
      {selectedCommand === 'compare' && (
        <div className="absolute -top-8 left-0 text-xs text-muted-foreground">
          Mention a model to compare with the currently selected model (@model-name)
        </div>
      )}
    </div>
  );
};
