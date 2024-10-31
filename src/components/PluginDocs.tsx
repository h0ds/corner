import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from 'lucide-react';

interface PluginDocsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PluginDocs: React.FC<PluginDocsProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-lg font-medium flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Plugin Documentation
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Overview</h2>
            <p className="text-sm text-muted-foreground">
              Plugins allow you to extend the functionality of the app by intercepting and modifying various events.
              Each plugin is a JavaScript module that exports a set of hooks that can be called at specific points in the application.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Plugin Structure</h2>
            <div className="bg-muted p-4 rounded-sm text-sm font-mono">
              {`{
  id: string;          // Unique identifier
  name: string;        // Display name
  description: string; // Short description
  version: string;     // Semantic version
  author: string;      // Author name
  enabled: boolean;    // Plugin state
  hooks: {            // Event handlers
    onMessage?: (message) => Promise<Message>;
    onThreadCreate?: (thread) => Promise<Thread>;
    onThreadDelete?: (threadId) => Promise<void>;
    onFileUpload?: (file) => Promise<File>;
  }
}`}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Available Hooks</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">onMessage</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Called before a message is sent or received. Can modify the message content or metadata.
                </p>
                <div className="bg-muted p-4 rounded-sm text-sm font-mono">
                  {`hooks: {
  onMessage: async (message) => {
    // Add timestamp to message
    return {
      ...message,
      timestamp: Date.now()
    };
  }
}`}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">onThreadCreate</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Called when a new thread is created. Can modify the thread properties.
                </p>
                <div className="bg-muted p-4 rounded-sm text-sm font-mono">
                  {`hooks: {
  onThreadCreate: async (thread) => {
    // Add custom metadata
    return {
      ...thread,
      metadata: {
        created: new Date().toISOString()
      }
    };
  }
}`}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">onThreadDelete</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Called before a thread is deleted. Can perform cleanup or prevent deletion.
                </p>
                <div className="bg-muted p-4 rounded-sm text-sm font-mono">
                  {`hooks: {
  onThreadDelete: async (threadId) => {
    // Perform cleanup
    await cleanupThread(threadId);
  }
}`}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">onFileUpload</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Called when a file is uploaded. Can modify the file content or metadata.
                </p>
                <div className="bg-muted p-4 rounded-sm text-sm font-mono">
                  {`hooks: {
  onFileUpload: async (file) => {
    // Add watermark to images
    if (file.type.startsWith('image/')) {
      return addWatermark(file);
    }
    return file;
  }
}`}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Example Plugin</h2>
            <div className="bg-muted p-4 rounded-sm text-sm font-mono whitespace-pre">
              {`{
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
}`}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Installation</h2>
            <p className="text-sm text-muted-foreground">
              To install a plugin:
            </p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
              <li>Click the "Upload" button in the Plugins tab</li>
              <li>Select your plugin file (.js or .ts)</li>
              <li>The plugin will be installed and appear in the plugins list</li>
              <li>Enable the plugin using the toggle switch</li>
            </ol>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Best Practices</h2>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li>Always handle errors gracefully in your hooks</li>
              <li>Return the original object if no modifications are needed</li>
              <li>Keep plugin code simple and focused on a single purpose</li>
              <li>Use async/await for asynchronous operations</li>
              <li>Test your plugin thoroughly before distribution</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 