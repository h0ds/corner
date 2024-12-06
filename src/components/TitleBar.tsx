import React from 'react';
import { Window } from '@tauri-apps/api/window';
import { X, Minus, Square, Maximize2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type } from '@tauri-apps/plugin-os';
import { InfoModal } from './InfoModal';
import { useLoadingStore } from '@/store/loadingStore';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = React.useState(false);
  const [isMacOS, setIsMacOS] = React.useState(false);
  const [isTrafficLightHovered, setIsTrafficLightHovered] = React.useState(false);
  const [showInfoModal, setShowInfoModal] = React.useState(false);
  const appWindow = Window.getCurrent();
  const { isLoading, progress } = useLoadingStore();

  React.useEffect(() => {
    const checkPlatform = async () => {
      try {
        const osType = await type();
        setIsMacOS(osType === 'macos');
        // Sync initial maximize state
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to detect platform:', error);
      }
    };
    checkPlatform();
  }, []);

  const handleMaximize = async () => {
    try {
      if (isMaximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
      setIsMaximized(!isMaximized);
    } catch (error) {
      console.error('Failed to toggle maximize state:', error);
    }
  };

  const handleDrag = async () => {
    await appWindow.startDragging();
  };

  const handleLogoClick = () => {
    setShowInfoModal(true);
  };

  if (isMacOS) {
    return (
      <>
        <div 
          className={cn(
            "h-8 flex items-center fixed top-0 left-0 right-0 z-50 backdrop-blur-sm",
            "border-b border-border rounded-t-xl bg-background/80"
          )}
          onMouseDown={handleDrag}
          style={{ cursor: 'move' }}
        >
          {/* macOS traffic lights */}
          <div 
            className="flex items-center pl-2 space-x-2 h-full"
            onMouseEnter={() => setIsTrafficLightHovered(true)}
            onMouseLeave={() => setIsTrafficLightHovered(false)}
          >
            <button
              onClick={() => appWindow.close()}
              className="h-3.5 w-3.5 rounded-full bg-accent border bg-red-500 border-red-600 inline-flex items-center justify-center group transition-colors"
            >
              <X className={cn(
                "h-2.5 w-2.5 text-foreground group-hover:text-red-900",
                isTrafficLightHovered ? "opacity-100" : "opacity-0"
              )} />
            </button>
            <button
              onClick={() => appWindow.minimize()}
              className="h-3.5 w-3.5 rounded-full bg-accent border bg-yellow-500 border-yellow-600 inline-flex items-center justify-center group transition-colors"
            >
              <Minus className={cn(
                "h-2.5 w-2.5 text-foreground group-hover:text-yellow-900",
                isTrafficLightHovered ? "opacity-100" : "opacity-0"
              )} />
            </button>
            <button
              onClick={handleMaximize}
              className="h-3.5 w-3.5 rounded-full bg-accent border bg-green-500 border-green-600 inline-flex items-center justify-center group transition-colors"
            >
              <Maximize2 className={cn(
                "h-[6px] w-[6px] text-foreground group-hover:text-green-900",
                isTrafficLightHovered ? "opacity-100" : "opacity-0"
              )} />
            </button>
            <button
              className={cn(
                "h-3.5 rounded-full bg-background border border-gray-400 relative overflow-hidden transition-all duration-300",
                isLoading ? "w-20 opacity-100" : "w-0 opacity-0",
                isLoading ? "cursor-wait" : "cursor-default"
              )}
              title={isLoading ? `Loading ${progress}%` : "Status"}
            >
              <div
                className={cn(
                  "absolute left-0 top-0 h-full bg-blue-500/20 transition-all duration-300",
                  isLoading ? "opacity-100" : "opacity-0"
                )}
                style={{ width: `${progress}%` }}
              />
            </button>
          </div>
          {/* Center section - App name */}
          {/* <div className="absolute left-1/2 -translate-x-1/2 flex items-center h-full">
            <span className="text-sm font-bold font-geist text-foreground">Corner</span>
          </div> */}

          {/* Title */}
          <div className="flex-1 flex items-center justify-end pr-1.5 h-full">
            <div 
              onClick={handleLogoClick}
              className="h-5 w-5 bg-black rounded-md flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Plus className="h-3 w-3 text-white" />
            </div>
          </div>
          
        </div>
        <InfoModal open={showInfoModal} onOpenChange={setShowInfoModal} />
      </>
    );
  }

  return (
    <>
      <div 
        className={cn(
          "h-10 flex items-center justify-between fixed top-0 left-0 right-0 z-50",
          "bg-background border-b border-border"
        )}
        onMouseDown={handleDrag}
        style={{ cursor: 'move' }}
      >
        {/* Left section - Empty */}
        <div 
          className="flex-1 h-full"
          onMouseDown={handleDrag}
        />

        {/* Center section - Empty */}
        <div 
          className="flex-1 h-full"
          onMouseDown={handleDrag}
        />

        {/* Right section - App icon and window controls */}
        <div className="flex items-center h-full">
          <div 
            onClick={handleLogoClick}
            className="h-5 w-5 bg-black rounded-lg flex items-center justify-center mr-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Plus className="h-3 w-3 text-white" />
          </div>
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
      <InfoModal open={showInfoModal} onOpenChange={setShowInfoModal} />
    </>
  );
};