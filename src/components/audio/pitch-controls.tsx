"use client";

import React from "react";
import { Sliders, Gauge, RotateCcw, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface PitchControlsProps {
  pitch: number; // -12 to +12 semitones
  speed: number; // 0.25 to 2.0
  onPitchChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onResetPitch: () => void;
  onResetSpeed: () => void;
  disabled?: boolean;
}

export function PitchControls({
  pitch,
  speed,
  onPitchChange,
  onSpeedChange,
  onResetPitch,
  onResetSpeed,
  disabled = false,
}: PitchControlsProps) {
  const extractValue = (vals: number | readonly number[]): number => {
    if (Array.isArray(vals)) return vals[0] ?? 0;
    return typeof vals === "number" ? vals : 0;
  };

  const formatPitchLabel = (val: number) => {
    if (val === 0) return "Original Key (0 st)";
    return val > 0 ? `+${val} Semitones` : `${val} Semitones`;
  };

  const speedPresets = [0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2.0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Pitch / Key Control */}
      <div className="flex flex-col justify-between space-y-3 rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Pitch / Key</span>
            </div>
            <Badge
              variant={pitch === 0 ? "secondary" : "default"}
              className="font-mono text-xs"
            >
              {formatPitchLabel(pitch)}
            </Badge>
          </div>

          <Slider
            value={[pitch]}
            min={-12}
            max={12}
            step={1}
            disabled={disabled}
            onValueChange={(vals) => onPitchChange(extractValue(vals))}
            className="cursor-pointer py-2"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              disabled={disabled || pitch <= -12}
              onClick={() => onPitchChange(Math.max(-12, pitch - 1))}
              className="h-7 w-7"
              title="-1 Semitone"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={disabled || pitch >= 12}
              onClick={() => onPitchChange(Math.min(12, pitch + 1))}
              className="h-7 w-7"
              title="+1 Semitone"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={disabled || pitch === 0}
            onClick={onResetPitch}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Reset Key
          </Button>
        </div>
      </div>

      {/* 2. Speed / Tempo Control */}
      <div className="flex flex-col justify-between space-y-3 rounded-xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Playback Speed</span>
            </div>
            <Badge
              variant={speed === 1 ? "secondary" : "default"}
              className="font-mono text-xs"
            >
              {speed.toFixed(2)}x ({Math.round(speed * 100)}%)
            </Badge>
          </div>

          <Slider
            value={[speed]}
            min={0.25}
            max={2.0}
            step={0.05}
            disabled={disabled}
            onValueChange={(vals) => onSpeedChange(extractValue(vals))}
            className="cursor-pointer py-2"
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-1">
            {speedPresets.map((preset) => (
              <Button
                key={preset}
                variant={speed === preset ? "default" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={() => onSpeedChange(preset)}
                className="h-6 px-2 text-[11px] font-mono"
              >
                {preset}x
              </Button>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled || speed === 1}
              onClick={onResetSpeed}
              className="h-6 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Reset Speed
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
