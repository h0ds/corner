import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  className?: string;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioRef,
  className,
  isPlaying,
  onPlay,
  onPause
}) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (!isDragging) {
        setProgress(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setProgress(0);
    };

    const handleEnded = () => {
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef, isDragging]);

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = value[0];
    audio.currentTime = newTime;
    setProgress(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = 0;
    setProgress(0);
    if (!isPlaying) {
      onPlay();
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-md transition-colors",
      isPlaying ? "bg-primary/10" : "bg-secondary/50",
      className
    )}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 shrink-0 transition-colors",
          isPlaying && "text-primary hover:text-primary/80"
        )}
        onClick={isPlaying ? onPause : onPlay}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-xs text-muted-foreground shrink-0 w-[40px] text-right">
          {formatTime(progress)}
        </span>
        
        <Slider
          value={[progress]}
          max={duration}
          step={0.1}
          className="flex-1"
          onValueChange={handleSeek}
          onValueCommit={() => setIsDragging(false)}
          onPointerDown={() => setIsDragging(true)}
        />

        <span className="text-xs text-muted-foreground shrink-0 w-[40px]">
          {formatTime(duration)}
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={restart}
      >
        <RotateCw className="h-4 w-4" />
      </Button>
    </div>
  );
};
