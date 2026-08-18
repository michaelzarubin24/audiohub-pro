"use client";

import React from "react";
import {
  Sliders,
  Sparkles,
  Maximize2,
  Volume2,
  Minimize2,
  Layers,
  Zap,
} from "lucide-react";
import { StereoWidenerOptions } from "@/lib/stereo-widener";

interface StereoControlsProps {
  options: StereoWidenerOptions;
  setOptions: React.Dispatch<React.SetStateAction<StereoWidenerOptions>>;
  disabled?: boolean;
}

const PRESETS = [
  {
    name: "Pure Mono",
    icon: Minimize2,
    desc: "Check mix balance in 100% mono",
    values: {
      widthPct: 0,
      bassMonoFreq: 0,
      haasDelayMs: 0,
      midGainDb: 0,
      sideGainDb: 0,
    },
  },
  {
    name: "Club Master",
    icon: Zap,
    desc: "Tight mono bass below 120Hz + 130% wide tops",
    values: {
      widthPct: 130,
      bassMonoFreq: 120,
      haasDelayMs: 0,
      midGainDb: 0,
      sideGainDb: 0,
    },
  },
  {
    name: "Subtle 3D",
    icon: Sparkles,
    desc: "Natural psychoacoustic widening",
    values: {
      widthPct: 150,
      bassMonoFreq: 80,
      haasDelayMs: 6,
      midGainDb: 0,
      sideGainDb: 0,
    },
  },
  {
    name: "Super Wide",
    icon: Maximize2,
    desc: "Ultra-wide soundstage with Haas delay",
    values: {
      widthPct: 200,
      bassMonoFreq: 160,
      haasDelayMs: 14,
      midGainDb: 0,
      sideGainDb: 1.5,
    },
  },
];

const BASS_CROSSOVER_FREQS = [
  { label: "Off (Full Stereo)", value: 0 },
  { label: "80 Hz", value: 80 },
  { label: "120 Hz (Standard)", value: 120 },
  { label: "160 Hz (Club)", value: 160 },
  { label: "240 Hz (Tight)", value: 240 },
];

export const StereoControls: React.FC<StereoControlsProps> = ({
  options,
  setOptions,
  disabled = false,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Быстрые пресеты */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
          Studio Mastering Presets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRESETS.map((p) => {
            const isMatch = options.widthPct === p.values.widthPct;
            const Icon = p.icon;

            return (
              <button
                key={p.name}
                type="button"
                disabled={disabled}
                onClick={() => setOptions((prev) => ({ ...prev, ...p.values }))}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-1.5 transition-all ${
                  isMatch
                    ? "bg-sky-950/40 border-sky-500/80 text-white shadow-md shadow-sky-500/10 ring-1 ring-sky-500/50"
                    : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <Icon
                    className={`w-4 h-4 ${isMatch ? "text-sky-400" : "text-zinc-400"}`}
                  />
                  <span className="text-xs font-bold">{p.name}</span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {p.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Основные слайдеры */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-6">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Mid / Side & Psychoacoustic Parameters
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stereo Width */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium">
                Stereo Soundstage Width
              </span>
              <span className="font-mono font-bold text-sky-400 text-sm">
                {options.widthPct}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="250"
              step="5"
              disabled={disabled}
              value={options.widthPct}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  widthPct: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>0% (Mono)</span>
              <span>100% (Original)</span>
              <span>250% (Max Wide)</span>
            </div>
          </div>

          {/* Haas Micro-Delay */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-300 font-medium">
                Haas Effect Micro-Delay
              </span>
              <span className="font-mono font-bold text-sky-400 text-sm">
                {options.haasDelayMs} ms
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              disabled={disabled}
              value={options.haasDelayMs}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  haasDelayMs: parseInt(e.target.value),
                }))
              }
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500 disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>0 ms (Off)</span>
              <span>10 ms (Subtle)</span>
              <span>25 ms (Spacious)</span>
            </div>
          </div>
        </div>

        {/* 3. Mono-Bass Filter (Mono Maker Crossover) */}
        <div className="space-y-3 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Mono-Maker Bass Crossover (Keep Lows in Mono)
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {options.bassMonoFreq === 0
                ? "Bypass"
                : `< ${options.bassMonoFreq} Hz in Mono`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {BASS_CROSSOVER_FREQS.map((freq) => {
              const isSelected = options.bassMonoFreq === freq.value;

              return (
                <button
                  key={freq.value}
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    setOptions((prev) => ({
                      ...prev,
                      bassMonoFreq: freq.value,
                    }))
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {freq.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
