import React, { useEffect, useState, useRef } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface AudioControlsProps {
  isPlaying: boolean;
  isLoading?: boolean;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  isLoading,
  onPause,
  onPlay,
  onStop
}) => {
  const [audioLevel, setAudioLevel] = useState<number[]>([]);
  const animationFrameRef = useRef<number>();

  // Simulate audio levels when playing
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setAudioLevel(Array.from({ length: 5 }, () => Math.random() * 100));
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel([]);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className="flex items-center gap-2 bg-accent/50 rounded-md px-2 py-1">
      {isLoading ? (
        <Volume2 className="h-4 w-4 animate-pulse" />
      ) : (
        <div className="flex items-end gap-0.5 h-4">
          {audioLevel.length > 0 ? (
            audioLevel.map((level, i) => (
              <div
                key={i}
                className="w-0.5 bg-foreground transition-all duration-150"
                style={{ height: `${Math.max(20, level)}%` }}
              />
            ))
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </div>
      )}
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={isPlaying ? onPause : onPlay}
          disabled={isLoading}
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onStop}
          disabled={isLoading}
        >
          <Square className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}; 