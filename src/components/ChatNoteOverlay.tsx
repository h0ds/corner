import React, { useState } from 'react';
import { ModelIcon } from './ModelIcon';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Loader2, X, MessageSquare } from 'lucide-react';
import { AVAILABLE_MODELS } from './ModelSelector';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ChatNoteOverlayProps {
  onClose: () => void;
  onResponse: (response: string) => void;
  selectedModel: string;
  className?: string;
  hideCloseButton?: boolean;
}

export const ChatNoteOverlay: React.FC<ChatNoteOverlayProps> = ({
  onClose,
  onResponse,
  selectedModel,
  className,
  hideCloseButton
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
      if (!model) throw new Error('Invalid model selected');

      const response = await invoke<{ content?: string; error?: string }>('send_message', {
        request: {
          message: prompt,
          model: selectedModel,
          provider: model.provider
        }
      });

      if (response.error) {
        toast({
          variant: "destructive",
          description: response.error,
          duration: 2000,
        });
      } else if (response.content) {
        onResponse(response.content);
        onClose();
      }
    } catch (error) {
      console.error('Failed to get response:', error);
      toast({
        variant: "destructive",
        description: "Failed to get response",
        duration: 2000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 gap-0 bg-background !rounded-xl backdrop-blur-xl shadow-2xl border border-border/50" hideCloseButton={hideCloseButton}>
        <form onSubmit={handleSubmit}>
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center gap-2 px-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask the AI..."
                className="h-7 px-0 border-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground shadow-none"
                disabled={isLoading}
                autoFocus
              />
              <div className="flex items-center gap-1">
                <ModelIcon modelId={selectedModel} className="h-4 w-4 text-muted-foreground" />
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-xs"
                    disabled={!prompt.trim()}
                  >
                    Ask
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-2 border-t border-border/50 text-xs text-muted-foreground">
            <span className="px-2">
              <kbd className="px-1 rounded bg-muted">Enter</kbd> to send
            </span>
            <span className="px-2">
              <kbd className="px-1 rounded bg-muted">Esc</kbd> to close
            </span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};