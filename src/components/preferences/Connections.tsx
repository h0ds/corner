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

      {/* Lex Connection */}
      <div className="flex items-center justify-between p-3 rounded-sm bg-muted">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-sm">
            <svg width="20" height="20" viewBox="0 0 237 237" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 21C1 9.9543 9.9543 1 21 1H216C227.046 1 236 9.9543 236 21V216C236 227.046 227.046 236 216 236H21C9.9543 236 1 227.046 1 216V21Z" fill="black"/>
              <path d="M57.6753 75.28V151H68.4753V160H47.4753V75.28H57.6753Z" fill="white"/>
              <path d="M104.062 97.36C122.182 97.36 132.742 111.76 132.142 132.28H85.9419C86.9019 146.44 94.9419 152.44 105.982 152.44C114.982 152.44 118.822 147.88 121.342 140.2L131.182 143.68C127.222 154.24 120.142 161.44 105.742 161.44C85.9419 161.44 75.7419 148.36 75.7419 129.16C75.7419 111.76 87.1419 97.36 104.062 97.36ZM104.062 106.36C95.1819 106.36 88.1019 112.84 86.3019 123.64H121.582C119.902 112.6 113.422 106.36 104.062 106.36Z" fill="white"/>
              <path d="M173.655 126.64L197.775 160H184.575L167.295 134.32L150.015 160H137.775L160.935 127.24L139.935 98.8H153.015L167.295 119.68L182.055 98.8H194.295L173.655 126.64Z" fill="white"/>
              <path d="M21 0.5C9.67816 0.5 0.5 9.67816 0.5 21V216C0.5 227.322 9.67816 236.5 21 236.5H216C227.322 236.5 236.5 227.322 236.5 216V21C236.5 9.67816 227.322 0.5 216 0.5H21Z" stroke="white"/>
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium">Lex</h4>
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
      <div className="flex items-center justify-between p-3 rounded-sm bg-muted">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-sm">
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
      <div className="flex items-center justify-between p-3 rounded-sm bg-muted">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-background rounded-sm">
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