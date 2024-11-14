import React from 'react';
import { cn } from '@/lib/utils';
import { Message, PluginModification } from '@/types';
import { ModelIcon } from './ModelIcon';
import { User, XCircle, Copy, ImageIcon } from 'lucide-react';
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
import { Citations } from './Citations';
import { ChatActions } from './ChatActions';

interface ChatMessageProps {
  role: Message['role'];
  content: string;
  onErrorClick?: () => void;
  modelId?: string;
  plugins?: PluginModification[];
  comparison?: Message['comparison'];
  citations?: { url: string; title?: string }[];
  images?: string[];
  relatedQuestions?: string[];
  onSendMessage?: (message: string) => void;
  onTextToSpeech?: (text: string) => Promise<void>;
  showTTS?: boolean;
  isAudioResponse?: boolean;
  onDelete?: () => void;
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
  plugins = [],
  comparison,
  citations,
  images,
  relatedQuestions,
  onSendMessage,
  onTextToSpeech,
  showTTS = false,
  isAudioResponse = false,
  onDelete,
}) => {
  // Process content to convert citation references to links
  const processContent = (content: string) => {
    if (!citations?.length) return content;

    // Replace [n] with markdown links
    return content.replace(/\[(\d+)\]/g, (match, num) => {
      const index = parseInt(num) - 1;
      if (index >= 0 && index < citations.length) {
        // Create markdown link with citation URL
        return `[${match}](${citations[index].url})`;
      }
      return match;
    });
  };

  const processedContent = processContent(content);

  const renderContent = () => {
    // Check if content is an audio data URL
    if (content.startsWith('data:audio/') || isAudioResponse) {
      return (
        <div className="flex flex-col gap-2">
          <audio 
            controls 
            src={content} 
            className="w-full max-w-[500px]"
            preload="metadata"
          >
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    let result = (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({inline, className, children, ...props}: React.ComponentPropsWithoutRef<'code'> & {
            inline?: boolean;
            className?: string;
          }) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (inline) {
              return (
                <code 
                  className="bg-muted px-1.5 py-0.5 rounded-xl text-sm font-mono" 
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="relative group my-4 bg-[#282c34] rounded-xl">
                <div 
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 
                            transition-opacity"
                >
                  <button
                    onClick={() => navigator.clipboard.writeText(String(children))}
                    className="p-1.5 hover:bg-accent/10 rounded-xl text-muted-foreground 
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
                    padding: '1rem',
                    background: 'transparent',
                    fontFamily: '"Server Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: '0.875rem',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            );
          },
          p: ({children}) => <p className="mb-4 text-sm first:mt-1 last:mb-0 ">{children}</p>,
          ul: ({children}) => <ul className="list-disc p-6 mb-6 last:mb-0 space-y-2 text-sm">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal px-8 py-6 last:mb-0 space-y-2 text-sm">{children}</ol>,
          li: ({children}) => <li className="mb-2 last:mb-0">{children}</li>,
          a: ({ node, children, ...props }: {
            node?: any;
            children?: React.ReactNode;
            [key: string]: any;
          }) => {
            // Check if this is a citation link
            const isCitation = children?.[0]?.toString?.().match(/^\[\d+\]$/);
            
            return (
              <a
                {...props}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "cursor-pointer",
                  isCitation 
                    ? "text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 no-underline" 
                    : "text-primary hover:underline"
                )}
              />
            );
          },
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
        {processedContent}
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

  if (role === 'comparison' && comparison) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="text-sm text-muted-foreground">
          Comparing responses for: "{comparison.message}"
        </div>
        <div className="flex gap-4">
          <div className="flex-1 border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ModelIcon modelId={comparison.model1.id} className="h-4 w-4" />
              <span className="text-sm font-medium">
                {AVAILABLE_MODELS.find(m => m.id === comparison.model1.id)?.name}
              </span>
            </div>
            <div className="text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // ... existing markdown components ...
                }}
              >
                {comparison.model1.response}
              </ReactMarkdown>
            </div>
          </div>
          <div className="flex-1 border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ModelIcon modelId={comparison.model2.id} className="h-4 w-4" />
              <span className="text-sm font-medium">
                {AVAILABLE_MODELS.find(m => m.id === comparison.model2.id)?.name}
              </span>
            </div>
            <div className="text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // ... existing markdown components ...
                }}
              >
                {comparison.model2.response}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex">
      <div className={cn(
        "group relative inline-flex gap-3 pl-4 pr-2 py-2 selection:bg-palette-blue selection:text-white rounded-xl select-text max-w-full",
        role === 'user' && 'bg-palette-blue text-white flex-row-reverse ml-auto',
        role === 'system' && 'bg-white/10 text-muted-foreground text-sm',
        role === 'assistant' && 'bg-white p-4 pb-6 border border-accent text-accent-foreground'
      )}>
        {role === 'assistant' && (
          <div className="absolute p-1 top-2 right-2 opacity-0 group-hover:opacity-100 bg-background border border-border rounded-xl transition-opacity flex gap-2">
            <ChatActions
              onConvertToSpeech={onTextToSpeech}
              onDelete={onDelete}
              content={content}
              showTTS={showTTS}
            />
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-md shrink-0",
                  role === 'assistant' ? "bg-accent text-accent-foreground" : "bg-white/10 text-white"
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
        </div>

        <div className={cn(
          "space-y-2 overflow-hidden min-w-0 font-sans",
          role === 'user' && 'text-right',
          role === 'system' && 'text-left',
          role === 'assistant' && 'text-left'
        )}>
          <div className={cn(
            "prose prose-sm dark:prose-invert max-w-none break-words",
            role === 'user' && 'text-white'
          )}>
            {renderContent()}
          </div>

          {/* Display images if present */}
          {images && images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {images.map((url, index) => (
                <div key={index} className="relative aspect-video group">
                  <img
                    src={url}
                    alt={`Generated image ${index + 1}`}
                    className="rounded-xl w-full h-full object-cover"
                  />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 
                           opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                  >
                    <ImageIcon className="h-6 w-6 text-white" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Display related questions if present */}
          {relatedQuestions && relatedQuestions.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground">Related Questions:</h4>
              <div className="flex flex-wrap gap-2">
                {relatedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => onSendMessage?.(question)}
                    className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 
                           dark:hover:text-blue-300 bg-accent/30 hover:bg-accent/50 
                           px-3 py-1.5 rounded-xl transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {citations && <Citations citations={citations} />}
          
          {/* ... other JSX ... */}
        </div>
      </div>
    </div>
  );
};
