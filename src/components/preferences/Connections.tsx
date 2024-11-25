import React from 'react';
import { Button } from "@/components/ui/button";

export const Connections: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Connected Services</h3>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
        >
          Add Connection
        </Button>
      </div> */}

      {/* Corner Connection */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-xl">
            <img 
              src="/icon.png" 
              alt="Corner" 
              className="h-6 w-6 cursor-pointer hover:opacity-80 transition-opacity" 
            />
          </div>
          <div>
            <h4 className="text-sm font-medium">Corner</h4>
            <p className="text-xs text-muted-foreground">Streamline usage across providers</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
        >
          Connect
        </Button>
      </div>

      {/* Hugging Face Connection */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-xl">
            <img src="/src/assets/icons/hf-logo.png" alt="Hugging Face" className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-medium">Hugging Face</h4>
            <p className="text-xs text-muted-foreground">Interact with models and datasets</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
        >
          Connect
        </Button>
      </div>

      {/* GitHub Connection */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-xl">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium">GitHub</h4>
            <p className="text-xs text-muted-foreground">Access and interact with repositories</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
        >
          Connect
        </Button>
      </div>
    </div>
  );
}; 