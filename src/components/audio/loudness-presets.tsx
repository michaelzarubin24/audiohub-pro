"use client";

import React from "react";
import {
  Music,
  Radio,
  Podcast,
  Sliders,
  Flame,
  Tv,
  Disc,
  ShieldCheck,
} from "lucide-react";

export interface LoudnessPreset {
  id: string;
  name: string;
  category: string;
  targetLufs: number;
  targetPeakCeilingDb: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const LOUDNESS_PRESETS: LoudnessPreset[] = [
  {
    id: "spotify",
    name: "Spotify & YouTube",
    category: "Streaming",
    targetLufs: -14.0,
    targetPeakCeilingDb: -1.0,
    description:
      "Industry gold standard for YouTube, Spotify, Tidal & Amazon Music.",
    icon: Music,
  },
  {
    id: "apple",
    name: "Apple Music",
    category: "Streaming",
    targetLufs: -16.0,
    targetPeakCeilingDb: -1.0,
    description:
      "Optimized for Sound Check algorithm and spatial dynamic range.",
    icon: Disc,
  },
  {
    id: "club",
    name: "Club & Beatport (EDM)",
    category: "Loud Master",
    targetLufs: -8.0,
    targetPeakCeilingDb: -0.3,
    description:
      "Maximum loudness, heavy bass punch and aggressive upfront presence.",
    icon: Flame,
  },
  {
    id: "cd",
    name: "CD / Modern Master",
    category: "Loud Master",
    targetLufs: -9.0,
    targetPeakCeilingDb: -0.5,
    description: "Commercial high-energy sound with preserved transient punch.",
    icon: Disc,
  },
  {
    id: "podcast",
    name: "Podcast & Voice",
    category: "Spoken Word",
    targetLufs: -16.0,
    targetPeakCeilingDb: -1.0,
    description:
      "AES TD1004 compliant speech clarity with high dialogue intelligibility.",
    icon: Podcast,
  },
  {
    id: "broadcast",
    name: "Broadcast (EBU R128)",
    category: "Television & Radio",
    targetLufs: -23.0,
    targetPeakCeilingDb: -1.0,
    description:
      "Strict European and International broadcast TV/Radio requirement.",
    icon: Tv,
  },
];

interface LoudnessPresetsProps {
  selectedPresetId: string;
  onSelectPreset: (preset: LoudnessPreset) => void;
  targetLufs: number;
  setTargetLufs: (v: number) => void;
  targetPeakCeilingDb: number;
  setTargetPeakCeilingDb: (v: number) => void;
  enableLimiter: boolean;
  setEnableLimiter: (v: boolean) => void;
  disabled?: boolean;
}

export const LoudnessPresets: React.FC<LoudnessPresetsProps> = ({
  selectedPresetId,
  onSelectPreset,
  targetLufs,
  setTargetLufs,
  targetPeakCeilingDb,
  setTargetPeakCeilingDb,
  enableLimiter,
  setEnableLimiter,
  disabled = false,
}) => {
  const isCustom = selectedPresetId === "custom";

  return (
    <div className="space-y-6">
      {/* 1. Сетка пресетов */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3 block">
          Target Standard & Streaming Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {LOUDNESS_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            const Icon = preset.icon;

            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectPreset(preset)}
                className={`p-3.5 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "bg-zinc-800/90 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/50"
                    : "bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-start justify-between w-full mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-100">
                        {preset.name}
                      </h4>
                      <span className="text-[11px] text-zinc-400">
                        {preset.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 text-xs font-mono font-bold rounded bg-zinc-950/80 text-blue-400 border border-zinc-800">
                      {preset.targetLufs} LUFS
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Ручные настройки (Target LUFS, Peak Ceiling, Limiter) */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Fine-Tuning & Mastering Parameters
            </span>
          </div>
          {isCustom ? (
            <span className="px-2 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
              Custom Mode
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[11px] font-medium bg-zinc-800 text-zinc-400 rounded">
              Preset Linked
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target LUFS Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Target Integrated Loudness</span>
              <span className="font-mono font-bold text-sm text-zinc-100">
                {targetLufs > 0 ? `+${targetLufs}` : targetLufs} LUFS
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="-6"
              step="0.5"
              disabled={disabled}
              value={targetLufs}
              onChange={(e) => {
                setTargetLufs(parseFloat(e.target.value));
              }}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>-30 (Quiet)</span>
              <span>-14 (Streaming)</span>
              <span>-6 (Loud EDM)</span>
            </div>
          </div>

          {/* True Peak Ceiling Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">True Peak Ceiling</span>
              <span className="font-mono font-bold text-sm text-zinc-100">
                {targetPeakCeilingDb > 0
                  ? `+${targetPeakCeilingDb}`
                  : targetPeakCeilingDb}{" "}
                dBTP
              </span>
            </div>
            <input
              type="range"
              min="-3.0"
              max="-0.1"
              step="0.1"
              disabled={disabled}
              value={targetPeakCeilingDb}
              onChange={(e) => {
                setTargetPeakCeilingDb(parseFloat(e.target.value));
              }}
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>-3.0 dB (Broadcast)</span>
              <span>-1.0 dB (Streaming Safe)</span>
              <span>-0.1 dB (Ceiling)</span>
            </div>
          </div>
        </div>

        {/* Brickwall Limiter Toggle */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                Lookahead True-Peak Limiter
              </div>
              <div className="text-[11px] text-zinc-400">
                Transparent 5ms lookahead brickwall protection to prevent
                inter-sample clipping.
              </div>
            </div>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEnableLimiter(!enableLimiter)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enableLimiter ? "bg-blue-600" : "bg-zinc-800"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enableLimiter ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
