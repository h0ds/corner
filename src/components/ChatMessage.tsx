import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { User, AlertCircle, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { ModelIcon } from './ModelIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AVAILABLE_MODELS } from './ModelSelector';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'error';
  content: string;
  onErrorClick?: () => void;
  modelId?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  role, 
  content, 
  onErrorClick,
  modelId 
}) => {
  const isError = role === 'error';
  const { theme } = useTheme();
  const isMonochrome = theme === 'black';
  
  const getModelInfo = () => {
    if (!modelId) return null;
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) return null;
    return {
      name: model.name,
      provider: model.provider === 'anthropic' ? 'Anthropic' : 'Perplexity'
    };
  };

  const getBackgroundColor = () => {
    if (isMonochrome) {
      return role === 'assistant' ? 'bg-black border border-white/20' : 
             isError ? 'bg-black' : 
             'bg-white';
    }
    return role === 'assistant' ? 'bg-card dark:bg-card/80' : 
           isError ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' :
           'bg-blue-600 dark:bg-blue-600';
  };

  const getTextColor = () => {
    if (isMonochrome) {
      return role === 'assistant' ? 'text-white' : 
             isError ? 'text-white' : 
             'text-black';
    }
    return role === 'assistant' ? 'text-foreground' : 
           isError ? 'text-red-600 dark:text-red-400' :
           'text-white';
  };

  const getAvatarColor = () => {
    if (isMonochrome) {
      return role === 'assistant' ? 'bg-black border border-white/20' : 
             'bg-black dark:bg-white';
    }
    return role === 'assistant' ? 'bg-blue-100 dark:bg-blue-900' : 
           isError ? 'bg-red-100 dark:bg-red-900' : 
           'bg-gray-100 dark:bg-gray-800';
  };

  const getIconColor = () => {
    if (isMonochrome) {
      return role === 'assistant' ? 'text-white' : 
             'text-white dark:text-black';
    }
    return role === 'assistant' ? 'text-blue-600 dark:text-blue-400' : 
           isError ? 'text-red-600 dark:text-red-400' : 
           'text-gray-600 dark:text-gray-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-4 max-w-[80%] ${role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className={`rounded-sm ${getAvatarColor()}`}>
              <AvatarFallback className="rounded-sm">
                {role === 'assistant' ? (
                  <ModelIcon modelId={modelId || ''} className={`h-4 w-4 ${getIconColor()}`} />
                ) : isError ? (
                  <AlertCircle className={`h-4 w-4 ${getIconColor()}`} />
                ) : (
                  <User className={`h-4 w-4 ${getIconColor()}`} />
                )}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          {role === 'assistant' && modelId && (
            <TooltipContent side="top" className="text-xs">
              {(() => {
                const info = getModelInfo();
                return info ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{info.name}</span>
                    <span className="text-muted-foreground">{info.provider}</span>
                  </div>
                ) : modelId;
              })()}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex-1"
      >
        <Card 
          className={`
            rounded-sm border-0 shadow-sm transition-colors
            ${getBackgroundColor()}
            ${isError ? 'cursor-pointer group' : ''}
          `}
          onClick={isError ? onErrorClick : undefined}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className={`whitespace-pre-wrap text-sm flex-1 selectable-text ${getTextColor()}`}>
                {isError ? `Error: ${content}` : content}
              </div>
              {isError && (
                <Settings className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${getTextColor()}`} />
              )}
            </div>
            {isError && (
              <div className={`text-xs mt-1 opacity-75 ${getTextColor()}`}>
                Click to open preferences
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
