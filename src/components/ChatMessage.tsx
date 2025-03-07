import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Message, PluginModification, Thread } from '@/types';
import { ModelIcon } from './ModelIcon';
import { User, XCircle, Copy, ImageIcon, Bot, Sparkles, Settings } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AVAILABLE_MODELS } from '@/lib/models';
import ReactMarkdown, { Components } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialOceanic } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Citations } from './Citations';
import { ChatActions } from './ChatActions';
import 'katex/dist/katex.min.css';
import katex from 'katex';
import { ChatMessageContextMenu } from './ChatMessageContextMenu';
import { nanoid } from 'nanoid';
import { showToast } from '@/lib/toast';
import { Button } from "@/components/ui/button";

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
  onDelete?: () => void;
  onForkToNote?: (content: string) => void;
  setThreads?: React.Dispatch<React.SetStateAction<Thread[]>>;
  onAskAgain?: (content: string) => void;
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

// Custom component to render LaTeX
const LatexRenderer: React.FC<{ latex: string, displayMode?: boolean }> = ({ latex, displayMode = false }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(latex, containerRef.current, {
          displayMode: displayMode,
          throwOnError: false,
          strict: false,
          trust: true,
          macros: {
            "\\N": "\\mathbb{N}",
            "\\R": "\\mathbb{R}",
            "\\Z": "\\mathbb{Z}",
            "\\Q": "\\mathbb{Q}",
            "\\C": "\\mathbb{C}",
            "\\P": "\\mathbb{P}",
          }
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
      }
    }
  }, [latex, displayMode]);

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "overflow-x-auto max-w-full",
        displayMode && "my-4 text-center py-2",
        !displayMode && "inline-block align-middle"
      )}
    />
  );
};

// Add type for code component props
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

// Add type for math component props
interface MathProps {
  value: string;
}

interface LinkProps {
  node?: any;
  children?: React.ReactNode;
  href?: string;
  [key: string]: any;
}

const components: Components = {
  code({ node, inline, className, children, ...props }: CodeProps) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    
    if (inline) {
      return (
        <code 
          className="bg-muted px-1.5 py-0.5 rounded-lg text-sm font-mono" 
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <div className="relative group my-4 bg-[#282c34] font-mono rounded-lg">
        <div 
          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 
                    transition-opacity"
        >
          <button
            onClick={() => navigator.clipboard.writeText(String(children))}
            className="p-1.5 hover:bg-accent/10 rounded-lg text-muted-foreground 
                      hover:text-accent-foreground"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <SyntaxHighlighter
          language={language || 'text'}
          style={materialOceanic as any}
          codeTagProps={{style: {fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'} }}
          customStyle={{
            background: 'transparent',
            fontSize: '0.875rem',
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  },
  math({ value }: MathProps) {
    return (
      <LatexRenderer latex={value} displayMode={true} />
    );
  },
  inlineMath({ value }: MathProps) {
    return (
      <LatexRenderer latex={value} displayMode={false} />
    );
  },
  a({ node, children, ...props }: LinkProps) {
    // Check if this is a citation link
    const firstChild = Array.isArray(children) ? children[0] : children;
    const isCitation = typeof firstChild === 'string' && firstChild.match(/^\[\d+\]$/);
    
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
      >
        {children}
      </a>
    );
  },
  // ... other components ...
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
  onDelete,
  onForkToNote,
  setThreads,
  onAskAgain,
}) => {
  const isUser = role === 'user';
  const isError = role === 'error';
  const isAssistant = role === 'assistant';
  const [copied, setCopied] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleAskAgain = useCallback(() => {
    if (onAskAgain && content) {
      onAskAgain(content);
    }
  }, [onAskAgain, content]);

  useEffect(() => {
    if (modelId) {
      console.log('ChatMessage received modelId:', modelId);
    }
  });

  const handleTextToSpeech = async () => {
    if (onTextToSpeech) {
      await onTextToSpeech(content);
    }
  };

  const handleForkToNote = () => {
    if (onForkToNote) {
      onForkToNote(content);
    }
  };

  if (role === 'error') {
    return (
      <ChatMessageContextMenu content={content}>
        <div className={cn(
          "group relative flex gap-3 px-4 py-3",
          "border border-destructive/20 bg-destructive/5",
          "rounded-xl text-destructive"
        )}>
          <div className="h-6 w-6 mt-1 shrink-0">
            <XCircle className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2 overflow-hidden">
            <div className="text-sm">
              {content.includes('rate limit') ? (
                <>
                  <span className="font-medium">Rate Limit Error: </span>
                  The model is currently at capacity. Please wait a moment and try again.
                </>
              ) : (
                <>
                  <span className="font-medium">Error: </span>
                  {content}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              {onErrorClick && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={onErrorClick}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Configure API keys</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <ChatActions
                content={content}
                onDelete={onDelete}
                className="text-destructive/70"
              />
            </TooltipProvider>
          </div>
        </div>
      </ChatMessageContextMenu>
    );
  }

  if (role === 'comparison' && comparison) {
    return (
      <ChatMessageContextMenu content={content}>
        <div className="flex flex-col pt-2 gap-2 w-full">
          <div className="text-sm text-muted-foreground/50">
            Comparing responses for: "{comparison.message}"
          </div>
          <div className="flex gap-2">
            <div className="flex-1 border border-border rounded-lg p-4 bg-background">
              <div className="flex items-center gap-2 mb-2">
                <ModelIcon modelId={comparison.model1.id} className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {AVAILABLE_MODELS.find(m => m.id === comparison.model1.id)?.name || comparison.model1.id}
                </span>
              </div>
              <div className="text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={components}
                >
                  {comparison.model1.response}
                </ReactMarkdown>
              </div>
            </div>
            <div className="flex-1 border border-border rounded-lg p-4 bg-background">
              <div className="flex items-center gap-2 mb-2">
                <ModelIcon modelId={comparison.model2.id} className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {AVAILABLE_MODELS.find(m => m.id === comparison.model2.id)?.name || comparison.model2.id}
                </span>
              </div>
              <div className="text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={components}
                >
                  {comparison.model2.response}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </ChatMessageContextMenu>
    );
  }

  const renderContent = (content: string) => {
    // Convert \[...\] to $$ ... $$ for display math
    const processedContent = content
      .replace(/\\\[(.*?)\\\]/gs, (_, group) => `$$${group}$$`)
      // Preserve line breaks by converting single newlines to <br/> tags
      .replace(/(?<!\n)\n(?!\n)/g, '  \n');

    return (
      <div className="prose dark:prose-invert max-w-none break-words">
        <ReactMarkdown
          remarkPlugins={[
            remarkGfm,
            [remarkMath, { 
              singleDollarTextMath: true
            }]
          ]}
          rehypePlugins={[[rehypeKatex, {
            strict: false,
            trust: true,
            throwOnError: false,
            macros: {
              "\\N": "\\mathbb{N}",
              "\\R": "\\mathbb{R}",
              "\\Z": "\\mathbb{Z}",
              "\\Q": "\\mathbb{Q}",
              "\\C": "\\mathbb{C}",
              "\\P": "\\mathbb{P}"
            }
          }]]}
          components={{
            ...components,
            p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
            // Handle line breaks within paragraphs
            br: () => <br className="mb-4" />,
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    );
  };

  // Debug model information
  console.log('ChatMessage rendering:', {
    role,
    modelId,
    isAssistant,
    availableModels: AVAILABLE_MODELS.map(m => m.id)
  });

  return (
    <div className={cn(
      "flex w-full",
      isUser && "justify-end"
    )}>
      <ChatMessageContextMenu
        content={content}
        onDelete={onDelete}
        onTextToSpeech={onTextToSpeech}
        onForkToNote={onForkToNote}
        onAskAgain={isUser ? handleAskAgain : undefined}
        showTTS={showTTS}
        isUserMessage={isUser}
      >
        <div className={cn(
          "group relative inline-flex gap-3 px-3 py-2.5 selection:bg-palette-blue selection:text-white rounded-lg select-text max-w-[80%]",
          isUser && 'bg-palette-blue text-white',
          isAssistant && 'bg-background border border-border text-accent-foreground'
        )}>
          {isAssistant && (
            <div className="absolute p-1 top-2 right-2 opacity-0 group-hover:opacity-100 bg-background border border-border rounded-lg transition-opacity flex gap-2">
            <ChatActions
              onConvertToSpeech={handleTextToSpeech}
              onDelete={onDelete}
              onForkToNote={onForkToNote}
              content={content}
              showTTS={showTTS}
            />
          </div>
          )}
          
          {!isUser && (
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-md border shadow-sm",
                "bg-background border-border"
              )}>
                {role === 'system' ? (
                  <Sparkles className="h-3 w-3" />
                ) : isAssistant && modelId ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center">
                          <ModelIcon modelId={modelId} className="h-3 w-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {(() => {
                          const model = AVAILABLE_MODELS.find(m => m.id === modelId);
                          return model ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-muted-foreground">{model.provider}</span>
                            </div>
                          ) : modelId;
                        })()}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Bot className="h-3 w-3" />
                )}
              </div>
            </div>
          )}

          <div className={cn(
            "space-y-2 overflow-hidden min-w-0 font-sans text-sm",
            isUser && 'text-right',
            isAssistant && 'text-left'
          )}>
            <div className={cn(
              "prose prose-sm dark:prose-invert max-w-none",
              isUser && 'text-white'
            )}>
              {renderContent(content)}
            </div>
            {citations && citations.length > 0 && (
              <Citations citations={citations} />
            )}
            {relatedQuestions && relatedQuestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {relatedQuestions.map((question, index) => (
                  <button
                    key={index}
                    className="text-xs px-2 py-1 rounded-md bg-accent hover:bg-accent/80 transition-colors"
                    onClick={() => onSendMessage?.(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isUser && (
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "flex h-6 w-6 shrink-0 select-none items-center justify-center rounded-md border shadow-sm",
                "bg-white/10 border-white/20"
              )}>
                <User className="h-3 w-3" />
              </div>
            </div>
          )}
        </div>
      </ChatMessageContextMenu>
    </div>
  );
};
