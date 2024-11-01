import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Input } from './ui/input';
import { ModelMention } from './ModelMention';
import { CommandMenu } from './CommandMenu';
import { AVAILABLE_MODELS } from './ModelSelector';
import { exit } from '@tauri-apps/plugin-process';

interface ChatInputProps {
  onSendMessage: (message: string, overrideModel?: string) => void;
  onClearThread?: () => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  onClearThread,
  disabled 
}) => {
  const [message, setMessage] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [commandQuery, setCommandQuery] = useState<string | null>(null);
  const [commandStartIndex, setCommandStartIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
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
          
          if (model) {
            // Get only the text after the space following the mention
            const cleanMessage = afterMention.slice(spaceIndex + 1).trim();
            
            if (cleanMessage) {
              console.log('Sending clean message:', cleanMessage); // Debug log
              onSendMessage(cleanMessage, model.id);
              setMessage('');
            }
            return;
          }
        }
      }
      
      // No valid model mention, send normally
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery !== null || commandQuery !== null) {
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
        e.preventDefault();
        return;
      }
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
    }

    setCommandQuery(null);
    setCommandStartIndex(null);
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
        <div className="flex-1 flex gap-2">
          <Input
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            disabled={disabled}
            className="h-[35px] resize-none rounded-sm text-sm 
                     bg-background placeholder:text-muted-foreground selectable-text"
          />
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
    </div>
  );
};
