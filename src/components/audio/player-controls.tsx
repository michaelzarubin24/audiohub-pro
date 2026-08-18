"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatTime } from "@/lib/audio-utils";

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0.0 to 1.0
  onPlayToggle: () => void;
  onSeek: (value: number) => void;
  onReset: () => void;
  onVolumeChange: (value: number) => void;
  disabled?: boolean;
}

export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlayToggle,
  onSeek,
  onReset,
  onVolumeChange,
  disabled = false,
}: PlayerControlsProps) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [prevVolume, setPrevVolume] = useState(0.8);

  const extractValue = (vals: number | readonly number[]): number => {
    if (Array.isArray(vals)) return vals[0] ?? 0;
    return typeof vals === "number" ? vals : 0;
  };

  const displayTime = isScrubbing ? scrubTime : currentTime;

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume || 0.8);
    }
  };

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur">
      {/* Progress & Time */}
      <div className="space-y-2">
        <Slider
          value={[displayTime]}
          max={duration > 0 ? duration : 100}
          step={0.1}
          disabled={disabled || duration === 0}
          onValueChange={(vals) => {
            setIsScrubbing(true);
            setScrubTime(extractValue(vals));
          }}
          onValueCommitted={(vals) => {
            const target = extractValue(vals);
            onSeek(target);
            setIsScrubbing(false);
          }}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs font-mono text-muted-foreground">
          <span>{formatTime(displayTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control Buttons & Volume */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        {/* Placeholder for desktop symmetry */}
        <div className="hidden sm:block w-36" />

        {/* Center Buttons */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onReset}
            disabled={disabled || duration === 0}
            title="Restart track"
            className="h-10 w-10 rounded-full"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            onClick={onPlayToggle}
            disabled={disabled || duration === 0}
            className="h-12 w-12 rounded-full shadow-md transition-transform active:scale-95"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </Button>
        </div>

        {/* Right Volume Slider */}
        <div className="flex items-center gap-2 w-full sm:w-36">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            disabled={disabled || duration === 0}
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            title={volume === 0 ? "Unmute" : "Mute"}
          >
            <VolumeIcon className="h-4 w-4" />
          </Button>
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            disabled={disabled || duration === 0}
            onValueChange={(vals) => {
              const val = extractValue(vals);
              onVolumeChange(val / 100);
            }}
            className="cursor-pointer flex-1"
          />
        </div>
      </div>
    </div>
  );
}
