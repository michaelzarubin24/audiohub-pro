"use client";

import React from "react";
import {
  RotateCw,
  RotateCcw,
  Infinity as InfinityIcon,
  Repeat,
  Sparkles,
  Sliders,
  Compass,
} from "lucide-react";
import {
  Spatial8DOptions,
  SpatialPattern,
  ReverbSpace,
} from "@/lib/spatial-8d";

interface SpatialPresetsProps {
  options: Spatial8DOptions;
  setOptions: React.Dispatch<React.SetStateAction<Spatial8DOptions>>;
  disabled?: boolean;
}

const PATTERNS: {
  id: SpatialPattern;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "circle-cw", label: "360° Clockwise", icon: RotateCw },
  { id: "circle-ccw", label: "360° Counter-CW", icon: RotateCcw },
  { id: "figure8", label: "Infinity (8D Flow)", icon: InfinityIcon },
  { id: "pendulum", label: "Left / Right Swing", icon: Repeat },
];

const REVERB_SPACES: { id: ReverbSpace; label: string; desc: string }[] = [
  {
    id: "studio",
    label: "Studio Room",
    desc: "Tight acoustics, clear panning.",
  },
  {
    id: "hall",
    label: "Concert Hall",
    desc: "Wide spatial depth and richness.",
  },
  {
    id: "cathedral",
    label: "Cathedral",
    desc: "Huge immersive cinematic space.",
  },
  {
    id: "dry",
    label: "Pure Binaural",
    desc: "Zero room reverb, maximum focus.",
  },
];

export const SpatialPresets: React.FC<SpatialPresetsProps> = ({
  options,
  setOptions,
  disabled = false,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Выбор траектории вращения (Orbit Pattern) */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
          Spatial Movement Trajectory
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PATTERNS.map((p) => {
            const isSelected = options.pattern === p.id;
            const Icon = p.icon;

            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() =>
                  setOptions((prev) => ({ ...prev, pattern: p.id }))
                }
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                  isSelected
                    ? "bg-fuchsia-950/40 border-fuchsia-500/80 text-white shadow-md shadow-fuchsia-500/10 ring-1 ring-fuchsia-500/50"
                    : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <Icon
                  className={`w-4 h-4 ${isSelected ? "text-fuchsia-400" : "text-zinc-400"}`}
                />
                <span className="text-xs font-semibold">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Слайдеры (Speed, Width, Elevation) */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Acoustic & Orbit Parameters
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Rotation Speed */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Rotation Cycle Speed</span>
              <span className="font-mono font-bold text-zinc-100">
                {options.speedSec}s / lap
              </span>
            </div>
            <input
              type="range"
              min="4"
              max="32"
              step="1"
              disabled={disabled}
              value={options.speedSec}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  speedSec: parseFloat(e.target.value),
                }))
              }
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>4s (Fast)</span>
              <span>12s (Standard)</span>
              <span>32s (Slow)</span>
            </div>
          </div>

          {/* Soundstage Width / Radius */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Soundstage Width</span>
              <span className="font-mono font-bold text-zinc-100">
                {options.radius}x
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.5"
              step="0.1"
              disabled={disabled}
              value={options.radius}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  radius: parseFloat(e.target.value),
                }))
              }
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>1.0x (Close)</span>
              <span>2.2x (Medium)</span>
              <span>3.5x (Wide 3D)</span>
            </div>
          </div>

          {/* Reverb Wet Mix */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400">Ambience Reverb Mix</span>
              <span className="font-mono font-bold text-zinc-100">
                {Math.round(options.reverbWet * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.5"
              step="0.05"
              disabled={disabled}
              value={options.reverbWet}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  reverbWet: parseFloat(e.target.value),
                }))
              }
              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>0% (Dry)</span>
              <span>25% (Balanced)</span>
              <span>50% (Spacious)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Акустическое пространство (Reverb Space) */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
          Acoustic Ambience Model
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {REVERB_SPACES.map((space) => {
            const isSelected = options.reverbSpace === space.id;

            return (
              <button
                key={space.id}
                type="button"
                disabled={disabled}
                onClick={() =>
                  setOptions((prev) => ({ ...prev, reverbSpace: space.id }))
                }
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                  isSelected
                    ? "bg-fuchsia-950/40 border-fuchsia-500/80 text-white shadow-sm"
                    : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{space.label}</span>
                  {isSelected && (
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {space.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
