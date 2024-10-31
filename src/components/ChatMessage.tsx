import React from 'react';
import { cn } from '@/lib/utils';
import { Message, PluginModification } from '@/types';
import { ModelIcon } from './ModelIcon';
import { User, XCircle, Copy, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AVAILABLE_MODELS } from './ModelSelector';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

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
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderContent = () => {
    let result = (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({inline, className, children, ...props}: {
            inline?: boolean;
            className?: string;
            children: React.ReactNode;
          }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (inline) {
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded-sm text-sm" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div className="relative group my-4 bg-[#282c34] rounded-sm">
                <div 
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 
                            transition-opacity"
                >
                  <button
                    onClick={() => navigator.clipboard.writeText(String(children))}
                    className="p-1.5 hover:bg-accent/10 rounded-sm text-muted-foreground 
                              hover:text-accent-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <SyntaxHighlighter
                  language={language}
                  style={oneDark}
                  customStyle={{
                    margin: 0,
                    borderRadius: '2px',
                    padding: '1.25rem',
                    background: 'transparent',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          },
          p: ({children}) => <p className="mb-2 first:mt-1 last:mb-0 ">{children}</p>,
          ul: ({children}) => <ul className="list-disc p-6 mb-6 last:mb-0 space-y-2">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal px-8 py-6 last:mb-0 space-y-2">{children}</ol>,
          li: ({children}) => <li className="mb-2 last:mb-0">{children}</li>,
          a: ({children, href}) => (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 px-0.5"
            >
              {children}
            </a>
          ),
          strong: ({children}) => (
            <span className="tracking-tighter font-medium underline">
              {children}
            </span>
          ),
          blockquote: ({children}) => (
            <blockquote className="border-l-2 border-border pl-6 py-2 italic mb-6 last:mb-0 text-muted-foreground">
              {children}
            </blockquote>
          ),
          table: ({children}) => (
            <div className="overflow-x-auto mb-6 last:mb-0">
              <table className="border-collapse w-full">
                {children}
              </table>
            </div>
          ),
          th: ({children}) => (
            <th className="border border-border px-6 py-3 bg-muted font-medium">
              {children}
            </th>
          ),
          td: ({children}) => (
            <td className="border border-border px-6 py-3">
              {children}
            </td>
          ),
          h1: ({children}) => <h1 className="text-2xl font-bold mb-6 mt-8 first:mt-0">{children}</h1>,
          h2: ({children}) => <h2 className="text-xl font-bold mb-4 mt-8 first:mt-0">{children}</h2>,
          h3: ({children}) => <h3 className="text-lg font-bold mb-4 mt-6 first:mt-0">{children}</h3>,
          h4: ({children}) => <h4 className="text-base font-bold mb-4 mt-6 first:mt-0">{children}</h4>,
          hr: () => <hr className="border-border my-8" />,
        }}
      >
        {content}
      </ReactMarkdown>
    );

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
      "flex items-start gap-4 group/message",
      role === 'user' && "flex-row-reverse"
    )}>
      <div className="flex flex-col items-center gap-2">
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

        {/* Copy button - only visible when hovering over the message */}
        {role === 'assistant' && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={copyToClipboard}
                  className="p-1.5 hover:bg-accent rounded-sm text-muted-foreground
                            transition-colors opacity-0 group-hover/message:opacity-100"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                Copy message
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className={cn(
        "flex-0 space-y-2 overflow-hidden text-sm selectable-text",
        "max-w-[80%] w-fit",
        role === 'user' && "text-right ml-auto",
        role === 'user' ? "bg-primary text-primary-foreground px-3 py-2 rounded-sm" : "border border-border/50 rounded-sm px-3 py-2 "
      )}>
        {renderContent()}
      </div>
    </div>
  );
};
