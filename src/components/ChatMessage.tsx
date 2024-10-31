import React from 'react';
import { cn } from '@/lib/utils';
import { Message, PluginModification } from '@/types';
import { ModelIcon } from './ModelIcon';
import { User, XCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AVAILABLE_MODELS } from './ModelSelector';

interface ChatMessageProps {
  role: Message['role'];
  content: string;
  onErrorClick?: () => void;
  modelId?: string;
  plugins?: PluginModification[];
}

// Add this component to render plugin content
const PluginContent: React.FC<{
  modification: PluginModification;
  pluginComponents?: Record<string, React.ComponentType<any>>;
}> = ({ modification, pluginComponents }) => {
  if (modification.componentName && pluginComponents?.[modification.componentName]) {
    const Component = pluginComponents[modification.componentName];
    return <Component {...modification.meta} />;
  }

  // Default to rendering as text if no component specified
  return <div dangerouslySetInnerHTML={{ __html: modification.content }} />;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  onErrorClick,
  modelId,
  plugins = []
}) => {
  const renderContent = () => {
    // Start with the original content
    let result = <div>{content}</div>;

    // Apply plugin modifications
    plugins.forEach(mod => {
      switch (mod.type) {
        case 'replace':
          result = <PluginContent modification={mod} />;
          break;
        case 'prepend':
          result = (
            <>
              <PluginContent modification={mod} />
              {result}
            </>
          );
          break;
        case 'append':
          result = (
            <>
              {result}
              <PluginContent modification={mod} />
            </>
          );
          break;
      }
    });

    return result;
  };

  if (role === 'error') {
    return (
      <div
        className="flex items-start gap-2 text-destructive cursor-pointer group"
        onClick={onErrorClick}
      >
        <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="text-sm">
          <span className="font-medium">Error: </span>
          {content}
          <div className="text-xs text-muted-foreground group-hover:underline">
            Click to configure API keys
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-start gap-4",
      role === 'user' && "flex-row-reverse"
    )}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "w-8 h-8 flex items-center justify-center rounded-sm shrink-0",
              role === 'assistant' ? "bg-accent text-accent-foreground" : "bg-accent text-accent-foreground"
            )}>
              {role === 'assistant' && modelId && (
                <ModelIcon modelId={modelId} className="h-4 w-4" />
              )}
              {role === 'user' && (
                <User className="h-4 w-4" />
              )}
            </div>
          </TooltipTrigger>
          {role === 'assistant' && modelId && (
            <TooltipContent side="top" className="text-xs">
              {(() => {
                const model = AVAILABLE_MODELS.find(m => m.id === modelId);
                return model ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-muted-foreground">
                      {model.provider === 'anthropic' ? 'Anthropic' : 
                       model.provider === 'openai' ? 'OpenAI' : 'Perplexity'}
                    </span>
                  </div>
                ) : modelId;
              })()}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <div className={cn(
        "flex-0 space-y-2 overflow-hidden text-sm selectable-text",
        "max-w-[80%] w-fit",
        role === 'user' && "text-right ml-auto",
        role === 'user' ? "bg-primary text-primary-foreground p-3 py-2 rounded-sm" : "border border-border/50 rounded-sm p-3 py-2"
      )}>
        {renderContent()}
      </div>
    </div>
  );
};
