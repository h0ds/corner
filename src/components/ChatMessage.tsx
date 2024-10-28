import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, User, AlertCircle, Settings } from "lucide-react";
import { motion } from "framer-motion";

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'error';
  content: string;
  onErrorClick?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, onErrorClick }) => {
  const isError = role === 'error';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex gap-4 max-w-[80%] ${role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
    >
      <Avatar className={`
        rounded-sm
        ${role === 'assistant' ? 'bg-blue-100 dark:bg-blue-900' : 
          isError ? 'bg-red-100 dark:bg-red-900' : 
          'bg-gray-100 dark:bg-gray-800'}
      `}>
        <AvatarFallback className="rounded-sm">
          {role === 'assistant' ? (
            <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          ) : isError ? (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          ) : (
            <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </AvatarFallback>
      </Avatar>
      
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex-1"
      >
        <Card 
          className={`
            rounded-sm border-0 shadow-sm
            ${role === 'assistant' ? 'bg-card dark:bg-card/80' : 
              isError ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors' :
              'bg-blue-600 dark:bg-blue-600 text-white'}
            ${isError ? 'cursor-pointer group' : ''}
          `}
          onClick={isError ? onErrorClick : undefined}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <div className="whitespace-pre-wrap text-sm flex-1">
                {isError ? `Error: ${content}` : content}
              </div>
              {isError && (
                <Settings className="h-4 w-4 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            {isError && (
              <div className="text-xs text-red-600 dark:text-red-400 mt-1 opacity-75">
                Click to open preferences
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};
