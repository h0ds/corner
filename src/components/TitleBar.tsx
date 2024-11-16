import React from 'react';
import { Window } from '@tauri-apps/api/window';
import { X, Minus, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { platform, type Platform } from '@tauri-apps/plugin-os';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [isMacOS, setIsMacOS] = React.useState(false);
  const appWindow = Window.getCurrent();

  React.useEffect(() => {
    const checkPlatform = async () => {
      const p: Platform = await platform();
      setIsMacOS(p === 'macos');
    };
    checkPlatform();
  }, []);

  const handleMaximize = async () => {
    const maximized = await appWindow.isMaximized();
    if (maximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
    setIsMaximized(!maximized);
  };

  const handleDrag = async () => {
    await appWindow.startDragging();
  };

  if (isMacOS) {
    return (
      <div 
        className={cn(
          "h-10 flex items-center fixed top-0 left-0 right-0 z-50",
          "bg-background border-b border-border"
        )}
        onMouseDown={handleDrag}
        style={{ cursor: 'move' }}
      >
        {/* macOS traffic lights */}
        <div className="flex items-center pl-2 space-x-2 h-full">
          <button
            onClick={() => appWindow.close()}
            className="h-3 w-3 rounded-full bg-red-500 hover:bg-red-600 inline-flex items-center justify-center"
          />
          <button
            onClick={() => appWindow.minimize()}
            className="h-3 w-3 rounded-full bg-yellow-500 hover:bg-yellow-600 inline-flex items-center justify-center"
          />
          <button
            onClick={handleMaximize}
            className="h-3 w-3 rounded-full bg-green-500 hover:bg-green-600 inline-flex items-center justify-center"
          />
        </div>

        {/* Title */}
        <div className="flex-1 flex items-center justify-center h-full">
          <span className="text-sm font-medium select-none text-muted-foreground">Corner</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "h-10 flex items-center justify-between fixed top-0 left-0 right-0 z-50",
        "bg-background border-b border-border"
      )}
      onMouseDown={handleDrag}
      style={{ cursor: 'move' }}
    >
      {/* Left section - App name/icon */}
      <div 
        className="flex-1 flex items-center px-3 h-full"
        onMouseDown={handleDrag}
      >
        <span className="text-sm font-medium select-none">Corner</span>
      </div>

      {/* Center section - Title */}
      <div 
        className="flex-1 text-center text-sm text-muted-foreground h-full"
        onMouseDown={handleDrag}
      />

      {/* Right section - Window controls */}
      <div className="flex items-center h-full">
        <button
          onClick={() => appWindow.minimize()}
          className="h-10 w-12 inline-flex items-center justify-center hover:bg-accent"
          style={{ cursor: 'default' }}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-10 w-12 inline-flex items-center justify-center hover:bg-accent"
          style={{ cursor: 'default' }}
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="h-10 w-12 inline-flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
          style={{ cursor: 'default' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};