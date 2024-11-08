import React from 'react';
import { window as tauriWindow } from '@tauri-apps/api';

export const TitleBar: React.FC = () => {
  return (
    <div 
      className="h-8 fixed top-0 left-0 right-0 bg-transparent"
      data-tauri-drag-region
      style={{ 
        WebkitUserSelect: 'none',
        cursor: 'default',
        WebkitAppRegion: 'drag',
        WebkitDragRegion: 'drag',
        touchAction: 'none',
        pointerEvents: 'auto'
      }}
    />
  );
}; 