import React from 'react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  return (
    <div className={`flex gap-4 max-w-[80%] ${role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
      <div className={`
        w-8 h-8 rounded-md flex items-center justify-center shrink-0
        ${role === 'assistant' ? 'bg-blue-100 text-blue-600' : 
          role === 'error' ? 'bg-red-100 text-red-600' : 
          'bg-gray-100 text-gray-600'}
      `}>
        {role === 'assistant' ? '🤖' : 
         role === 'error' ? '⚠️' : 
         '👤'}
      </div>
      <div className={`
        rounded-md px-4 py-2 shadow-sm text-sm
        ${role === 'assistant' ? 'bg-white' : 
          role === 'error' ? 'bg-red-50 text-red-600 border border-red-200' :
          'bg-blue-600 text-white'}
      `}>
        <div className="whitespace-pre-wrap">
          {role === 'error' ? `Error: ${content}` : content}
        </div>
      </div>
    </div>
  );
};
