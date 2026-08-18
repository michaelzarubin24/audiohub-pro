"use client";

import React from "react";
import {
  Palette,
  Layers,
  Video,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  Square,
  Type,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  WaveformConfig,
  WaveformStyle,
  AspectRatioType,
} from "@/lib/waveform-generator";

interface WaveformControlsProps {
  mode: "static" | "video";
  onModeChange: (mode: "static" | "video") => void;
  config: WaveformConfig;
  onChange: (newConfig: WaveformConfig) => void;
  disabled?: boolean;
}

export const PRESET_PALETTES = [
  { name: "Neon Violet", start: "#8B5CF6", end: "#EC4899" },
  { name: "Cyber Cyan", start: "#06B6D4", end: "#3B82F6" },
  { name: "Sunset Glow", start: "#F59E0B", end: "#EF4444" },
  { name: "Emerald Wave", start: "#10B981", end: "#06B6D4" },
  { name: "Monochrome", start: "#FFFFFF", end: "#71717A" },
];

export function WaveformControls({
  mode,
  onModeChange,
  config,
  onChange,
  disabled = false,
}: WaveformControlsProps) {
  const extractValue = (vals: number | readonly number[]): number => {
    if (Array.isArray(vals)) return vals[0] ?? 0;
    return typeof vals === "number" ? vals : 0;
  };

  const update = (partial: Partial<WaveformConfig>) => {
    onChange({ ...config, ...partial });
  };

  const setRatio = (ratio: AspectRatioType) => {
    if (ratio === "9:16") {
      update({
        aspectRatio: "9:16",
        width: 1080,
        height: 1920,
        backgroundColor: "#09090b",
      });
    } else if (ratio === "1:1") {
      update({
        aspectRatio: "1:1",
        width: 1080,
        height: 1080,
        backgroundColor: "#09090b",
      });
    } else {
      update({ aspectRatio: "16:9", width: 1920, height: 1080 });
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur">
      {/* 1. Mode Switcher */}
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Output Type
          </span>
        </div>
        <div className="flex items-center rounded-lg border border-border/80 bg-secondary/30 p-1">
          <Button
            variant={mode === "video" ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange("video")}
            disabled={disabled}
            className="h-7 px-3 text-xs font-semibold gap-1.5"
          >
            <Video className="h-3.5 w-3.5" />
            Dynamic Video
          </Button>
          <Button
            variant={mode === "static" ? "default" : "ghost"}
            size="sm"
            onClick={() => onModeChange("static")}
            disabled={disabled}
            className="h-7 px-3 text-xs font-semibold gap-1.5"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Static Graphic
          </Button>
        </div>
      </div>

      {/* 2. Video Specific Controls */}
      {mode === "video" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Social Format & Ratio
            </span>
            {/* Beat Reactive Button */}
            <Button
              variant={config.isReactive ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => update({ isReactive: !config.isReactive })}
              className="h-7 px-2.5 text-xs font-semibold gap-1.5"
            >
              <Activity className="h-3.5 w-3.5" />
              {config.isReactive ? "Beat Bounce: ON" : "Beat Bounce: OFF"}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={config.aspectRatio === "9:16" ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => setRatio("9:16")}
              className="text-xs gap-1.5 h-9"
            >
              <Smartphone className="h-4 w-4" />
              Reels / TikTok (9:16)
            </Button>
            <Button
              variant={config.aspectRatio === "1:1" ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => setRatio("1:1")}
              className="text-xs gap-1.5 h-9"
            >
              <Square className="h-4 w-4" />
              Post / Square (1:1)
            </Button>
            <Button
              variant={config.aspectRatio === "16:9" ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => setRatio("16:9")}
              className="text-xs gap-1.5 h-9"
            >
              <Monitor className="h-4 w-4" />
              YouTube (16:9)
            </Button>
          </div>

          {/* Track Title Overlay */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <Type className="h-3.5 w-3.5" />
              <span>Track Title Overlay:</span>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Mykhailo Zarubin - Summer Vibe"
                value={config.trackTitle}
                disabled={disabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  update({ trackTitle: e.target.value, showTitle: true })
                }
                className="h-8 text-xs bg-background/50"
              />
              <Button
                variant={config.showTitle ? "default" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={() => update({ showTitle: !config.showTitle })}
                className="h-8 text-xs shrink-0"
              >
                {config.showTitle ? "Title On" : "Title Off"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Waveform Style */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <span>Waveform Style</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { id: "bars", label: "Classic Bars" },
              { id: "mirrored", label: "Mirrored Bars" },
              { id: "wave", label: "Smooth Line" },
              { id: "solid", label: "Solid Outline" },
            ] as { id: WaveformStyle; label: string }[]
          ).map((item) => (
            <Button
              key={item.id}
              variant={config.style === item.id ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => update({ style: item.id })}
              className="text-xs"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 4. Color Palettes */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Palette className="h-3.5 w-3.5 text-primary" />
            <span>Color Palette</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Background:</span>
            <Button
              variant={
                config.backgroundColor === "transparent" ? "default" : "outline"
              }
              size="sm"
              disabled={disabled}
              onClick={() =>
                update({
                  backgroundColor:
                    config.backgroundColor === "transparent"
                      ? "#09090b"
                      : "transparent",
                })
              }
              className="h-6 px-2 text-[11px]"
            >
              {config.backgroundColor === "transparent"
                ? "Transparent"
                : "Dark BG"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_PALETTES.map((p) => {
            const isSelected =
              config.colorStart === p.start && config.colorEnd === p.end;
            return (
              <button
                key={p.name}
                type="button"
                disabled={disabled}
                onClick={() => update({ colorStart: p.start, colorEnd: p.end })}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-border/70 hover:bg-secondary/40 text-muted-foreground"
                }`}
              >
                <div
                  className="h-3.5 w-3.5 rounded-full shadow-inner"
                  style={{
                    background: `linear-gradient(135deg, ${p.start}, ${p.end})`,
                  }}
                />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Density & Spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t border-border/40">
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-muted-foreground">Bar Count</span>
            <span className="font-mono text-muted-foreground">
              {config.barCount}
            </span>
          </div>
          <Slider
            value={[config.barCount]}
            min={32}
            max={200}
            step={8}
            disabled={disabled}
            onValueChange={(v) => update({ barCount: extractValue(v) })}
            className="cursor-pointer py-1"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Spacing / Gap
            </span>
            <span className="font-mono text-muted-foreground">
              {Math.round(config.barGap * 100)}%
            </span>
          </div>
          <Slider
            value={[config.barGap * 100]}
            min={10}
            max={70}
            step={5}
            disabled={disabled}
            onValueChange={(v) => update({ barGap: extractValue(v) / 100 })}
            className="cursor-pointer py-1"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              Corner Radius
            </span>
            <span className="font-mono text-muted-foreground">
              {config.barRadius}px
            </span>
          </div>
          <Slider
            value={[config.barRadius]}
            min={0}
            max={12}
            step={1}
            disabled={disabled}
            onValueChange={(v) => update({ barRadius: extractValue(v) })}
            className="cursor-pointer py-1"
          />
        </div>
      </div>
    </div>
  );
}
