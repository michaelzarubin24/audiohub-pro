"use client";

import React from "react";
import { Settings2, Music2, Cpu, Radio, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ConversionOptions,
  OutputFormat,
  BitrateOption,
  SampleRateOption,
  ChannelMode,
} from "@/lib/audio-converter";

interface FormatSelectorProps {
  options: ConversionOptions;
  onChange: (options: ConversionOptions) => void;
  disabled?: boolean;
}

const BITRATE_PRESETS: { label: string; value: BitrateOption; desc: string }[] =
  [
    { label: "320 kbps", value: 320, desc: "Studio Ultra" },
    { label: "256 kbps", value: 256, desc: "High Quality" },
    { label: "192 kbps", value: 192, desc: "Standard" },
    { label: "128 kbps", value: 128, desc: "Compact" },
  ];

const SAMPLE_RATE_PRESETS: { label: string; value: SampleRateOption }[] = [
  { label: "Keep Original", value: 0 },
  { label: "44.1 kHz (CD/Music)", value: 44100 },
  { label: "48.0 kHz (Video/Film)", value: 48000 },
  { label: "96.0 kHz (Hi-Res)", value: 96000 },
];

export function FormatSelector({
  options,
  onChange,
  disabled = false,
}: FormatSelectorProps) {
  const update = (partial: Partial<ConversionOptions>) => {
    onChange({ ...options, ...partial });
  };

  return (
    <div className="space-y-5 rounded-xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <Settings2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Conversion Settings</span>
      </div>

      {/* 1. Target Format */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Music2 className="h-3.5 w-3.5 text-primary" />
            Target Format
          </span>
          <span className="font-mono text-primary">
            {options.format.toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={options.format === "mp3" ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => update({ format: "mp3" })}
            className="h-10 text-xs font-semibold"
          >
            MP3 (MPEG Audio)
          </Button>
          <Button
            variant={options.format === "wav" ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => update({ format: "wav" })}
            className="h-10 text-xs font-semibold"
          >
            WAV (Lossless PCM)
          </Button>
        </div>
      </div>

      {/* 2. MP3 Bitrate Selection (Only visible when MP3 is selected) */}
      {options.format === "mp3" && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Bitrate Quality
            </span>
            <span className="font-mono">{options.bitrate} kbps</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BITRATE_PRESETS.map((b) => (
              <Button
                key={b.value}
                variant={options.bitrate === b.value ? "default" : "outline"}
                size="sm"
                disabled={disabled}
                onClick={() => update({ bitrate: b.value })}
                className="flex flex-col h-11 items-center justify-center p-1 text-xs"
              >
                <span className="font-semibold">{b.label}</span>
                <span className="text-[10px] text-muted-foreground font-normal opacity-80">
                  {b.desc}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Sample Rate & Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
        {/* Sample Rate */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            <span>Sample Rate</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {SAMPLE_RATE_PRESETS.map((sr) => (
              <Button
                key={sr.value}
                variant={
                  options.sampleRate === sr.value ? "secondary" : "outline"
                }
                size="sm"
                disabled={disabled}
                onClick={() => update({ sampleRate: sr.value })}
                className={`h-8 text-[11px] truncate ${
                  options.sampleRate === sr.value
                    ? "border-primary font-medium"
                    : ""
                }`}
              >
                {sr.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-primary" />
            <span>Channels</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              variant={options.channels === "stereo" ? "secondary" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => update({ channels: "stereo" })}
              className={`h-8 text-xs ${
                options.channels === "stereo"
                  ? "border-primary font-medium"
                  : ""
              }`}
            >
              Stereo (2 Ch)
            </Button>
            <Button
              variant={options.channels === "mono" ? "secondary" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => update({ channels: "mono" })}
              className={`h-8 text-xs ${
                options.channels === "mono" ? "border-primary font-medium" : ""
              }`}
            >
              Mono (1 Ch)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
