"use client";

import React from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { LoudnessMetrics } from "@/lib/loudness-meter";

interface LoudnessCompareCardProps {
  originalMetrics: LoudnessMetrics | null;
  finalMetrics: LoudnessMetrics | null;
  gainAppliedDb: number | null;
  targetLufs: number;
}

export const LoudnessCompareCard: React.FC<LoudnessCompareCardProps> = ({
  originalMetrics,
  finalMetrics,
  gainAppliedDb,
  targetLufs,
}) => {
  if (!originalMetrics) return null;

  // Визуальный прогресс шкалы от -35 LUFS до -5 LUFS
  const getMeterPercent = (lufs: number) => {
    const min = -35;
    const max = -5;
    const clamped = Math.max(min, Math.min(max, lufs));
    return ((clamped - min) / (max - min)) * 100;
  };

  const isPeakSafe = (finalMetrics?.truePeakDb || 0) <= -0.5;

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-zinc-200">
            Acoustic & Loudness Analysis (ITU-R BS.1770-4)
          </h3>
        </div>
        {gainAppliedDb !== null && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>
              Gain Delta:{" "}
              {gainAppliedDb > 0 ? `+${gainAppliedDb}` : gainAppliedDb} dB
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Исходные метрики */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-3">
          <div className="flex justify-between items-center text-xs text-zinc-400">
            <span className="font-semibold uppercase tracking-wider">
              Original Input
            </span>
            <span className="font-mono text-zinc-400">Raw Audio</span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-400">Integrated LUFS</span>
            <span className="font-mono font-bold text-lg text-zinc-200">
              {originalMetrics.integratedLufs}{" "}
              <span className="text-xs text-zinc-400">LUFS</span>
            </span>
          </div>

          {/* Meter Bar */}
          <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-500 transition-all duration-500"
              style={{
                width: `${getMeterPercent(originalMetrics.integratedLufs)}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-850 text-xs font-mono">
            <div>
              <span className="text-[11px] text-zinc-400 block">True Peak</span>
              <span className="font-semibold text-zinc-300">
                {originalMetrics.truePeakDb} dBTP
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block">
                Sample Peak
              </span>
              <span className="font-semibold text-zinc-300">
                {originalMetrics.samplePeakDb} dBFS
              </span>
            </div>
          </div>
        </div>

        {/* Финальные метрики после нормализации */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-blue-500/30 space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold uppercase tracking-wider text-blue-400">
              Normalized Output
            </span>
            <span className="font-mono text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Target: {targetLufs} LUFS
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-400">Integrated LUFS</span>
            <span className="font-mono font-bold text-lg text-blue-400">
              {finalMetrics ? finalMetrics.integratedLufs : targetLufs}{" "}
              <span className="text-xs text-zinc-400">LUFS</span>
            </span>
          </div>

          {/* Meter Bar */}
          <div className="w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{
                width: `${getMeterPercent(
                  finalMetrics ? finalMetrics.integratedLufs : targetLufs,
                )}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-850 text-xs font-mono">
            <div>
              <span className="text-[11px] text-zinc-400 block">True Peak</span>
              <span
                className={`font-semibold ${
                  isPeakSafe ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {finalMetrics ? finalMetrics.truePeakDb : "--"} dBTP
              </span>
            </div>
            <div>
              <span className="text-[11px] text-zinc-400 block">
                Sample Peak
              </span>
              <span className="font-semibold text-zinc-300">
                {finalMetrics ? finalMetrics.samplePeakDb : "--"} dBFS
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
