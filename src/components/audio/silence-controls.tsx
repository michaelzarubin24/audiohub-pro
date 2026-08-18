"use client";

import React from "react";
import { Sliders, VolumeX, Timer, ShieldAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface SilenceControlsProps {
  thresholdDb: number;
  minSilenceMs: number;
  paddingMs: number;
  onThresholdChange: (val: number) => void;
  onMinSilenceChange: (val: number) => void;
  onPaddingChange: (val: number) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function SilenceControls({
  thresholdDb,
  minSilenceMs,
  paddingMs,
  onThresholdChange,
  onMinSilenceChange,
  onPaddingChange,
  onReset,
  disabled = false,
}: SilenceControlsProps) {
  const extractValue = (vals: number | readonly number[]): number => {
    if (Array.isArray(vals)) return vals[0] ?? 0;
    return typeof vals === "number" ? vals : 0;
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            Silence Detection Settings
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="h-7 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3 mr-1" /> Reset Defaults
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
        {/* 1. Silence Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <VolumeX className="h-3.5 w-3.5" />
              <span>Threshold</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {thresholdDb} dB
            </Badge>
          </div>
          <Slider
            value={[thresholdDb]}
            min={-60}
            max={-15}
            step={1}
            disabled={disabled}
            onValueChange={(vals) => onThresholdChange(extractValue(vals))}
            className="cursor-pointer py-1"
          />
          <p className="text-[11px] text-muted-foreground">
            Audio below this volume is considered silence.
          </p>
        </div>

        {/* 2. Min Silence Duration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Timer className="h-3.5 w-3.5" />
              <span>Min Duration</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {minSilenceMs} ms
            </Badge>
          </div>
          <Slider
            value={[minSilenceMs]}
            min={100}
            max={2000}
            step={50}
            disabled={disabled}
            onValueChange={(vals) => onMinSilenceChange(extractValue(vals))}
            className="cursor-pointer py-1"
          />
          <p className="text-[11px] text-muted-foreground">
            Only pauses longer than this will be removed.
          </p>
        </div>

        {/* 3. Padding Margin */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Edge Padding</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {paddingMs} ms
            </Badge>
          </div>
          <Slider
            value={[paddingMs]}
            min={0}
            max={250}
            step={10}
            disabled={disabled}
            onValueChange={(vals) => onPaddingChange(extractValue(vals))}
            className="cursor-pointer py-1"
          />
          <p className="text-[11px] text-muted-foreground">
            Buffer around cuts to preserve natural endings.
          </p>
        </div>
      </div>
    </div>
  );
}
