import React, { useState } from 'react';
import { MessageSquare, Loader2, Check } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ModelIcon } from './ModelIcon';
import { Button } from './ui/button';
import { invoke } from '@tauri-apps/api/core';
import { useToast } from "@/hooks/use-toast";
import { AVAILABLE_MODELS } from './ModelSelector';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NoteContextMenuProps {
  children: React.ReactNode;
  selectedModel: string;
  onInsertResponse?: (response: string) => void;
}

export const NoteContextMenu: React.FC<NoteContextMenuProps> = ({
  children,
  selectedModel: initialModel,
  onInsertResponse
}) => {
  const [selectedText, setSelectedText] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const { toast } = useToast();

  const getSelectedText = () => {
    const selection = window.getSelection();
    return selection?.toString() || '';
  };

  const stripCitations = (text: string): string => {
    // Remove citations in square brackets (e.g., [1], [2,3])
    return text.replace(/\[\d+(?:,\s*\d+)*\]/g, '');
  };

  const handleAskAI = async () => {
    if (!selectedText.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
      if (!model) throw new Error('Invalid model selected');

      const aiResponse = await invoke<{ content?: string; error?: string }>('send_message', {
        request: {
          message: `Help me understand this text: "${selectedText}"`,
          model: selectedModel,
          provider: model.provider
        }
      });

      if (aiResponse.error) {
        toast({
          variant: "destructive",
          description: aiResponse.error,
          duration: 2000,
        });
      } else if (aiResponse.content) {
        // Strip citations from the response
        const processedResponse = stripCitations(aiResponse.content);
        setResponse(processedResponse);
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

  const handleInsertResponse = () => {
    if (response && onInsertResponse) {
      onInsertResponse(response);
      setShowDialog(false);
      setResponse(null);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onMouseUp={(e) => {
            const text = getSelectedText();
            if (text) {
              setSelectedText(text);
            }
          }}
          className="h-full"
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-2"
          disabled={!selectedText.trim()}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Ask AI about selection</span>
          <ModelIcon modelId={selectedModel} className="h-4 w-4 ml-auto text-muted-foreground" />
        </ContextMenuItem>
      </ContextMenuContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Ask AI about Selection</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected text preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Selected Text:</label>
              <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                {selectedText}
              </div>
            </div>

            {/* Model selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Choose Model:</label>
              <Select
                value={selectedModel}
                onValueChange={setSelectedModel}
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        <ModelIcon modelId={model.id} className="h-4 w-4" />
                        <span>{model.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Response section */}
            {response && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Response:</label>
                <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                  {response}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {!response ? (
              <Button
                onClick={handleAskAI}
                disabled={isLoading || !selectedText.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Ask AI
              </Button>
            ) : (
              <Button
                onClick={handleInsertResponse}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Insert Response
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setResponse(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContextMenu>
  );
};