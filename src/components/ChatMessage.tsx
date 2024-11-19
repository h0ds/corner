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
import { materialOceanic } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Citations } from './Citations';
import { ChatActions } from './ChatActions';
import 'katex/dist/katex.min.css';
import katex from 'katex';

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
  const renderContent = () => {
    console.log('Raw content:', content);
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
      processedContent = `\\[${processedContent}\\]`;
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
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';
              
              // Special handling for LaTeX code blocks
              if (language === 'latex') {
                const content = String(children)
                  .replace(/\\\\(?=[a-zA-Z])/g, '\\') // Unescape LaTeX commands
                  .trim();
                return (
                  <div className="my-4">
                    <LatexRenderer 
                      latex={content} 
                      displayMode={true} 
                    />
                  </div>
                );
              }
              
              // Check if content looks like LaTeX
              const content = String(children);
              const hasLatexCommands = /\\[a-zA-Z]+({[^}]*}|\s*{[^}]*})?/.test(content);
              const hasLatexDelimiters = /\$|\\\(|\\\[/.test(content);
              const hasLatexOperators = /[_^{}\[\]]/.test(content);
              
              // If it looks like LaTeX and isn't explicitly marked as a programming language,
              // render it as math
              if (!language && (hasLatexCommands || (hasLatexDelimiters && hasLatexOperators))) {
                return (
                  <LatexRenderer 
                    latex={content} 
                    displayMode={!inline} 
                  />
                );
              }
              
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
                    language={language}
                    style={materialOceanic}
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
            math: ({ value, ...props }) => {
              console.log('Math component received:', { value, props });
              return (
                <div className="my-2">
                  <LatexRenderer latex={value} displayMode={true} />
                </div>
              );
            },
            inlineMath: ({ value, ...props }) => {
              console.log('InlineMath component received:', { value, props });
              return <LatexRenderer latex={value} displayMode={false} />;
            },
            text: ({ value, ...props }) => {
              console.log('Text component received:', { value, props });
              return <span>{value}</span>;
            },
            p: ({children}) => <p className="mb-4 text-sm first:mt-1 last:mb-0">{children}</p>,
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
      </div>
    );
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
                components={{
                  code({ node, inline, className, children, ...props }) {
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
                          language={language}
                          style={materialOceanic}
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
                  math: ({ value, ...props }) => {
                    console.log('Display Math Node:', { value });
                    return (
                      <div className="my-2">
                        <LatexRenderer latex={value} displayMode={true} />
                      </div>
                    );
                  },
                  inlineMath: ({ value, ...props }) => {
                    console.log('Inline Math Node:', { value });
                    return <LatexRenderer latex={value} displayMode={false} />;
                  },
                  p: ({children}) => <p className="mb-4 text-sm first:mt-1 last:mb-0">{children}</p>,
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
                components={{
                  code({ node, inline, className, children, ...props }) {
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
                          language={language}
                          style={materialOceanic}
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
                  math: ({ value, ...props }) => {
                    console.log('Display Math Node:', { value });
                    return (
                      <div className="my-2">
                        <LatexRenderer latex={value} displayMode={true} />
                      </div>
                    );
                  },
                  inlineMath: ({ value, ...props }) => {
                    console.log('Inline Math Node:', { value });
                    return <LatexRenderer latex={value} displayMode={false} />;
                  },
                  p: ({children}) => <p className="mb-4 text-sm first:mt-1 last:mb-0">{children}</p>,
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
                {comparison.model2.response}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderers = {
    // Handle inline math (enclosed in single $)
    inlineMath: ({ value }: { value: string }) => (
      <LatexRenderer latex={value} displayMode={false} />
    ),
    // Handle display math (enclosed in double $$)
    math: ({ value }: { value: string }) => (
      <LatexRenderer latex={value} displayMode={true} />
    ),
  };

  return (
    <div className="w-full flex">
      <div className={cn(
        "group relative inline-flex gap-2 pl-4 pr-2 py-2 selection:bg-palette-blue selection:text-white rounded-lg select-text max-w-full",
        role === 'user' && 'bg-palette-blue text-white flex-row-reverse ml-auto',
        role === 'system' && 'bg-background/10 text-muted-foreground text-sm',
        role === 'assistant' && 'bg-background p-4 border border-border text-accent-foreground'
      )}>
        {role === 'assistant' && (
          <div className="absolute p-1 top-2 right-2 opacity-0 group-hover:opacity-100 bg-background border border-border rounded-lg transition-opacity flex gap-2">
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
                  role === 'assistant' ? "bg-accent text-accent-foreground" : "bg-background/10 text-white"
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
            "prose prose-sm dark:prose-invert max-w-none",
            "break-words",
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
                    className="rounded-lg w-full h-full object-cover"
                  />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 
                           opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
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
                           px-3 py-1.5 rounded-lg transition-colors"
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
