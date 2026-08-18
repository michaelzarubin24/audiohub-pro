"use client";

import React from "react";
import {
  Compass,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Activity,
  Layers,
} from "lucide-react";
import { KeyDetectionResult } from "@/lib/bpm-key-detector";

interface CamelotWheelCardProps {
  keyData: KeyDetectionResult | null;
}

const NOTE_LABELS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const CamelotWheelCard: React.FC<CamelotWheelCardProps> = ({
  keyData,
}) => {
  if (!keyData) return null;

  const isMinor = keyData.scale === "Minor";

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-6">
      {/* 1. Заголовок и главные карточки тональности */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Harmonic Mixing & Key Matrix
            </h3>
            <span className="text-xs text-zinc-400">
              Camelot Wheel Standard for Harmonic DJ Transitions
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700">
            Confidence: {keyData.confidence}%
          </span>
        </div>
      </div>

      {/* 2. Основные плашки (Key, Camelot, Relative) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Main Musical Key */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-purple-500/30 relative overflow-hidden">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Detected Key
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400 font-mono">
              {keyData.rootKey}
            </span>
            <span className="text-sm font-medium text-zinc-300">
              {keyData.scale}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {isMinor ? "Aeolian / Natural Minor" : "Ionian / Natural Major"}
          </span>
        </div>

        {/* Camelot Code */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Camelot Wheel Code
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              {keyData.camelot}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
              {isMinor ? "Minor Deck (A)" : "Major Deck (B)"}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Universal DJ standard
          </span>
        </div>

        {/* Relative Key */}
        <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Relative Key (Same Notes)
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-200 font-mono">
              {keyData.relativeKey}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Parallel scale harmony
          </span>
        </div>
      </div>

      {/* 3. Матрица гармонического сведения (DJ Mixing Paths) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>Harmonic Transition Guides</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Smooth Mix (Same Energy) */}
          <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-200">
                  Smooth / Seamless
                </span>
                <span className="font-mono text-xs font-bold text-blue-400">
                  {keyData.compatibleKeys.sameEnergy.join(" / ")}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Zero key clash. Ideal for long blend transitions, mashups and
                layering.
              </p>
            </div>
          </div>

          {/* Energy Boost (+1) */}
          <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-200">
                  Energy Boost (+1)
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">
                  {keyData.compatibleKeys.energyBoost}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Raises harmonic intensity. Great for peak-time builds and drops.
              </p>
            </div>
          </div>

          {/* Energy Drop (-1) */}
          <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-zinc-200">
                  Energy Drop (-1)
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">
                  {keyData.compatibleKeys.energyDrop}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                Lowers tension smoothly for breakdown or outro cooldowns.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. 12-полосная Хромаграмма (Pitch Distribution Spectrum) */}
      <div className="space-y-2.5 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Chroma Energy Spectrum (12 Semitones)</span>
          </div>
          <span className="font-mono text-[11px] text-zinc-400">
            Krumhansl-Schmuckler Distribution
          </span>
        </div>

        <div className="grid grid-cols-12 gap-1.5 items-end h-16 p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
          {keyData.chromaProfile.map((energy, idx) => {
            const isRoot = NOTE_LABELS[idx] === keyData.rootKey;
            const heightPct = Math.max(12, Math.round(energy * 100));

            return (
              <div
                key={NOTE_LABELS[idx]}
                className="flex flex-col items-center gap-1 h-full justify-end"
              >
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    isRoot
                      ? "bg-purple-500 shadow-sm shadow-purple-500/50"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span
                  className={`text-[10px] font-mono leading-none ${
                    isRoot ? "font-bold text-purple-400" : "text-zinc-400"
                  }`}
                >
                  {NOTE_LABELS[idx]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
