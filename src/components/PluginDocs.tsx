import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";

interface PluginDocsProps {
  isOpen: boolean;
  onClose: () => void;
}

const CodeBlock = ({ children, className }: { children: string, className?: string }) => (
  <pre className={cn(
    "bg-muted p-4 rounded-sm text-sm font-mono overflow-x-auto",
    "border border-border/50",
    className
  )}>
    <code className="text-[13px] leading-relaxed">
      {children}
    </code>
  </pre>
);

export const PluginDocs: React.FC<PluginDocsProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose} className="h-full w-full">
      
      <DialogContent className="h-[calc(100vh-3rem)] w-full max-w-none p-0">
        <div className="h-full w-full overflow-y-auto p-8">
          {/* Overview */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Overview</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plugins allow you to extend the functionality of Lex by intercepting and modifying various events.
              Each plugin is a JavaScript module that exports a set of hooks that can be called at specific points in the application.
            </p>
          </section>

          {/* Plugin Structure */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Plugin Structure</h2>
            <CodeBlock>{`interface Plugin {
  id: string;          // Unique identifier
  name: string;        // Display name
  description: string; // Short description
  version: string;     // Semantic version
  author: string;      // Author name
  enabled: boolean;    // Plugin state
  hooks: {            // Event handlers
    onMessage?: (message: Message) => Promise<Message>;
    onThreadCreate?: (thread: Thread) => Promise<Thread>;
    onThreadDelete?: (threadId: string) => Promise<void>;
    onFileUpload?: (file: File) => Promise<File>;
  }
}`}</CodeBlock>
          </section>

          {/* Available Hooks */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Available Hooks</h2>
            <div className="space-y-6">
              {/* onMessage */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">onMessage</h3>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                    async
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Called before a message is sent or received. Can modify the message content or metadata.
                </p>
                <CodeBlock>{`hooks: {
  onMessage: async (message) => {
    // Add timestamp to message
    const timestamp = new Date().toLocaleTimeString();
    return {
      ...message,
      content: \`[\${timestamp}] \${message.content}\`
    };
  }
}`}</CodeBlock>
              </div>

              {/* onThreadCreate */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">onThreadCreate</h3>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                    async
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Called when a new thread is created. Can modify the thread properties.
                </p>
                <CodeBlock>{`hooks: {
  onThreadCreate: async (thread) => {
    // Add custom metadata
    return {
      ...thread,
      metadata: {
        created: new Date().toISOString()
      }
    };
  }
}`}</CodeBlock>
              </div>

              {/* onThreadDelete */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">onThreadDelete</h3>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                    async
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Called before a thread is deleted. Can perform cleanup or prevent deletion.
                </p>
                <CodeBlock>{`hooks: {
  onThreadDelete: async (threadId) => {
    // Perform cleanup or prevent deletion
    if (await shouldPreventDelete(threadId)) {
      throw new Error('Cannot delete this thread');
    }
    await cleanupThread(threadId);
  }
}`}</CodeBlock>
              </div>

              {/* onFileUpload */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">onFileUpload</h3>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                    async
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Called when a file is uploaded. Can modify the file content or metadata.
                </p>
                <CodeBlock>{`hooks: {
  onFileUpload: async (file) => {
    // Add watermark to images
    if (file.type.startsWith('image/')) {
      return await addWatermark(file);
    }
    return file;
  }
}`}</CodeBlock>
              </div>
            </div>
          </section>

          {/* Example Plugin */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Example Plugin</h2>
            <CodeBlock>{`{
  id: "timestamp-plugin",
  name: "Timestamp Plugin",
  description: "Adds timestamps to messages",
  version: "1.0.0",
  author: "Your Name",
  enabled: true,
  hooks: {
    onMessage: async (message) => {
      // Add timestamp to message
      const timestamp = new Date().toLocaleTimeString();
      return {
        ...message,
        content: \`[\${timestamp}] \${message.content}\`
      };
    },
    onThreadCreate: async (thread) => {
      // Add creation time to thread
      return {
        ...thread,
        metadata: {
          created: new Date().toISOString()
        }
      };
    }
  }
}`}</CodeBlock>
          </section>

          {/* Installation */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Installation</h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>To install a plugin:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Click the "Upload" button in the Plugins tab</li>
                <li>Select your plugin file (.js or .ts)</li>
                <li>The plugin will be installed and appear in the plugins list</li>
                <li>Enable the plugin using the toggle switch</li>
              </ol>
            </div>
          </section>

          {/* Best Practices */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Best Practices</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-2">
              <li>Always handle errors gracefully in your hooks</li>
              <li>Return the original object if no modifications are needed</li>
              <li>Keep plugin code simple and focused on a single purpose</li>
              <li>Use async/await for asynchronous operations</li>
              <li>Test your plugin thoroughly before distribution</li>
            </ul>
          </section>

          {/* Custom Components */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Custom Components</h2>
            <p className="text-sm text-muted-foreground">
              Plugins can define custom React components to render content in messages.
            </p>
            <CodeBlock>{`{
              id: "chart-plugin",
              name: "Chart Plugin",
              description: "Adds charts to messages",
              version: "1.0.0",
              author: "Your Name",
              enabled: true,
              // Define custom components
              components: {
                BarChart: ({ data }) => (
                  <div className="chart">
                    {/* Your chart implementation */}
                  </div>
                )
              },
              hooks: {
                onMessage: async (message) => {
                  // Check if message contains chart data
                  if (message.content.includes('chart:')) {
                    return {
                      ...message,
                      plugins: [{
                        type: 'replace',
                        content: '<div>Chart placeholder</div>',
                        componentName: 'BarChart',
                        meta: { data: parseChartData(message.content) },
                        pluginId: 'chart-plugin'
                      }]
                    };
                  }
                  return message;
                }
              }
            }`}</CodeBlock>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};