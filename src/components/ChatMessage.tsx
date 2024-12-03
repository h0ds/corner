import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Message, PluginModification, Thread } from '@/types';
import { ModelIcon } from './ModelIcon';
import { User, XCircle, Copy, ImageIcon, Bot, Sparkles } from 'lucide-react';
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
        // Log the input
        console.log('LaTeX Input:', { latex, displayMode });
        
        // Step 1: Remove delimiters but respect display mode
        let processed = latex;
        if (latex.startsWith('\\[') && latex.endsWith('\\]')) {
          processed = latex.slice(2, -2).trim();
          displayMode = true;
        } else if (latex.startsWith('$$') && latex.endsWith('$$')) {
          processed = latex.slice(2, -2).trim();
          displayMode = true;
        } else if (latex.startsWith('$') && latex.endsWith('$')) {
          processed = latex.slice(1, -1).trim();
          displayMode = false;
        } else if (!latex.includes('\\[') && !latex.includes('\\]') && !latex.includes('$$')) {
          // If no delimiters are present, treat it as inline math
          processed = latex.trim();
          displayMode = false;
        }
        console.log('After delimiter removal:', processed);

        katex.render(processed, containerRef.current, {
          displayMode: displayMode,
          throwOnError: false,
          strict: false,
          trust: true,
          output: 'html',
          macros: {
            "\\N": "\\mathbb{N}",
            "\\R": "\\mathbb{R}",
            "\\Z": "\\mathbb{Z}",
            "\\Q": "\\mathbb{Q}",
            "\\C": "\\mathbb{C}",
            "\\P": "\\mathbb{P}",
            "\\GM": "\\text{GM}",
            "\\AM": "\\text{AM}",
            "\\HM": "\\text{HM}"
          }
        });
      } catch (error) {
        console.error('LaTeX rendering error:', { error, latex });
        // Fallback to showing the raw LaTeX
        if (containerRef.current) {
          containerRef.current.textContent = latex;
        }
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
      <div className="my-2">
        <LatexRenderer latex={value} displayMode={true} />
      </div>
    );
  },
  inlineMath({ value }: MathProps) {
    return <LatexRenderer latex={value} displayMode={false} />;
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
}) => {
  console.log('ChatMessage received modelId:', modelId);

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
      <div
        className="flex items-start gap-2 text-destructive cursor-pointer group"
        onClick={onErrorClick}
      >
        <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
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
          <div className="text-xs text-muted-foreground group-hover:underline">
            Click to configure API keys
          </div>
        </div>
      </div>
    );
  }

  if (role === 'comparison' && comparison) {
    return (
      <div className="flex flex-col pt-2 gap-2 w-full">
        <div className="text-sm text-muted-foreground/50">
          Comparing responses for: "{comparison.message}"
        </div>
        <div className="flex gap-2">
          <div className="flex-1 border border-border rounded-lg p-4 bg-background">
            <div className="flex items-center gap-2 mb-2">
              <ModelIcon modelId={comparison.model1.id} className="h-4 w-4" />
              <span className="text-sm font-medium">
                {AVAILABLE_MODELS.find(m => m.id === comparison.model1.id)?.name}
              </span>
            </div>
            <div className="text-sm">
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  [remarkMath, { 
                    singleDollarTextMath: true,
                    doubleBackslashDisplayMath: true
                  }]
                ]}
                rehypePlugins={[[rehypeKatex, {
                  strict: false,
                  trust: true,
                  output: 'html',
                  throwOnError: false,
                  displayMode: true
                }]]}
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
                {AVAILABLE_MODELS.find(m => m.id === comparison.model2.id)?.name}
              </span>
            </div>
            <div className="text-sm">
              <ReactMarkdown
                remarkPlugins={[
                  remarkGfm,
                  [remarkMath, { 
                    singleDollarTextMath: true,
                    doubleBackslashDisplayMath: true
                  }]
                ]}
                rehypePlugins={[[rehypeKatex, {
                  strict: false,
                  trust: true,
                  output: 'html',
                  throwOnError: false,
                  displayMode: true
                }]]}
                components={components}
              >
                {comparison.model2.response}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    console.log('Raw content:', content);
    // Process content to wrap LaTeX in delimiters if needed
    let processedContent = content;
    
    // First, normalize the expression by combining it into a single LaTeX expression
    processedContent = processedContent
      // Remove nested dollar signs
      .replace(/\$\$([^$]+)\$\$/g, '$1')
      // Handle function arguments
      .replace(/\$([^$]+)\$\(([^)]+)\)/g, '$1($2)')
      // Combine the entire expression
      .replace(/\$([^$]+)\$\s*=\s*\$([^$]+)\$\s*\(([^)]+)\)\s*\+\s*i\$([^$]+)\$\s*\(([^)]+)\)/g, '$$1 = $2($3) + i$4($5)$');
    
    // If the content matches Euler's formula pattern, wrap it in display math
    if (/e\^{i.*?}\s*=\s*\\cos\(.*?\)\s*\+\s*i\\sin\(.*?\)/.test(processedContent)) {
      processedContent = processedContent.trim();
    } else {
      // Otherwise, proceed with normal LaTeX processing
      const placeholders: {[key: string]: string} = {};
      let counter = 0;
      
      processedContent = processedContent.replace(/\$.*?\$|\\\[.*?\\\]|\\\(.*?\\\)/g, (match) => {
        const placeholder = `__LATEX_PLACEHOLDER_${counter}__`;
        placeholders[placeholder] = match;
        counter++;
        return placeholder;
      });
      
      const latexRegex = /\\[a-zA-Z]+{[^}]*}|\\[a-zA-Z]+\s*\{[^}]*\}|\\[a-zA-Z]+|[a-zA-Z0-9]+\^{[^}]*}|[a-zA-Z0-9]+_{[^}]*}/g;
      const matches = processedContent.match(latexRegex);
      
      if (matches) {
        matches.forEach(match => {
          processedContent = processedContent.replace(match, `$${match}$`);
        });
      }
      
      Object.entries(placeholders).forEach(([placeholder, original]) => {
        processedContent = processedContent.replace(placeholder, original);
      });
    }

    return (
      <div>
        <ReactMarkdown
          remarkPlugins={[
            remarkGfm,
            [remarkMath, { 
              singleDollarTextMath: true,
              doubleBackslashDisplayMath: true
            }]
          ]}
          rehypePlugins={[[rehypeKatex, {
            strict: false,
            trust: true,
            output: 'html',
            throwOnError: false,
            displayMode: true,
            macros: {
              "\\N": "\\mathbb{N}",
              "\\R": "\\mathbb{R}",
              "\\Z": "\\mathbb{Z}",
              "\\Q": "\\mathbb{Q}",
              "\\C": "\\mathbb{C}",
              "\\P": "\\mathbb{P}"
            }
          }]]}
          components={components}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    );
  };

  const isAssistant = role === 'assistant';
  const isUser = role === 'user';
  const isSystem = role === 'system';

  // Debug model information
  console.log('ChatMessage rendering:', {
    role,
    modelId,
    isAssistant,
    availableModels: AVAILABLE_MODELS.map(m => m.id)
  });

  return (
    <ChatMessageContextMenu
      content={content}
      onDelete={onDelete}
      onTextToSpeech={handleTextToSpeech}
      onForkToNote={handleForkToNote}
      showTTS={showTTS}
    >
      <div className={cn(
        "group relative inline-flex gap-2 px-2 py-2 selection:bg-palette-blue selection:text-white rounded-lg select-text max-w-[80%]",
        isUser && 'bg-palette-blue text-white ml-auto',
        isSystem && 'bg-background/10 text-muted-foreground text-sm',
        isAssistant && 'bg-background border border-border text-accent-foreground'
      )}>
        {isAssistant && (
          <div className="absolute p-1 top-2 right-2 opacity-0 group-hover:opacity-100 bg-background border border-border rounded-lg transition-opacity flex gap-2">
            <ChatActions
              onConvertToSpeech={handleTextToSpeech}
              onDelete={onDelete}
              onForkToNote={handleForkToNote}
              content={content}
              showTTS={showTTS}
            />
          </div>
        )}
        
        {!isUser && (
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              "flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-md border shadow-sm",
              "bg-background border-border"
            )}>
              {isSystem ? (
                <Sparkles className="h-4 w-4" />
              ) : isAssistant && modelId ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center">
                        <ModelIcon modelId={modelId} className="h-4 w-4" />
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
                <Bot className="h-4 w-4" />
              )}
            </div>
          </div>
        )}

        <div className={cn(
          "space-y-2 overflow-hidden min-w-0 font-sans text-sm",
          isUser && 'text-right',
          isSystem && 'text-left',
          isAssistant && 'text-left'
        )}>
          <div className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            isUser && 'text-white'
          )}>
            {renderContent()}
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
              "flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-md border shadow-sm",
              "bg-white/10 border-white/20"
            )}>
              <User className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    </ChatMessageContextMenu>
  );
};
