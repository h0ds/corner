import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, User, AlertCircle } from "lucide-react";

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  return (
    <div className={`flex gap-4 max-w-[80%] ${role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
      <Avatar className={`
        rounded-sm
        ${role === 'assistant' ? 'bg-blue-100' : 
          role === 'error' ? 'bg-red-100' : 
          'bg-gray-100'}
      `}>
        <AvatarFallback className="rounded-sm">
          {role === 'assistant' ? (
            <Bot className="h-4 w-4 text-blue-600" />
          ) : role === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <User className="h-4 w-4 text-gray-600" />
          )}
        </AvatarFallback>
      </Avatar>
      
      <Card className={`
        rounded-sm border-0 shadow-sm
        ${role === 'assistant' ? 'bg-white' : 
          role === 'error' ? 'bg-red-50 text-red-600' :
          'bg-blue-600 text-white'}
      `}>
        <CardContent className="p-3">
          <div className="whitespace-pre-wrap">
            {role === 'error' ? `Error: ${content}` : content}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
