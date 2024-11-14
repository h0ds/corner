import React, { useEffect, useState, useRef } from 'react';
import { Play, Square, Volume2, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface AudioControlsProps {
  isPlaying: boolean;
  isLoading?: boolean;
  onPlay: () => void;
  onStop: () => void;
  onRestart: () => void;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  isLoading,
  onPlay,
  onStop,
  onRestart
}) => {
  const [audioLevel, setAudioLevel] = useState<number[]>([]);
  const animationFrameRef = useRef<number>();

  // Simulate audio levels when playing
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        // Generate 5 audio levels with smooth transitions
        setAudioLevel(prev => {
          return Array.from({ length: 5 }, (_, i) => {
            const target = Math.random() * 80 + 20; // Random value between 20-100
            const current = prev[i] || 0;
            // Smooth transition by moving 20% toward target
            return current + (target - current) * 0.2;
          });
        });
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Gradually fade out audio levels
      setAudioLevel(prev => prev.map(level => level * 0.9));
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-1.5">
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <div className="flex items-end gap-0.5 h-4">
          {audioLevel.length > 0 ? (
            audioLevel.map((level, i) => (
              <div
                key={i}
                className="w-0.5 bg-foreground transition-all duration-75"
                style={{ height: `${Math.max(20, level)}%` }}
              />
            ))
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </div>
      )}
      
      <div className="flex items-center gap-1">
        {isPlaying ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRestart}
            disabled={isLoading}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onPlay}
            disabled={isLoading}
          >
            <Play className="h-3 w-3" />
          </Button>
        )}
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