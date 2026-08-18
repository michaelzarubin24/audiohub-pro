"use client";

import React from "react";
import { Scissors, Clock, Sparkles } from "lucide-react";
import { formatTime } from "@/lib/audio-utils";
import { SilenceStats } from "@/lib/silence-remover";

interface SilenceStatsCardProps {
  stats: SilenceStats;
}

export function SilenceStatsCard({ stats }: SilenceStatsCardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-center backdrop-blur">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
          <Clock className="h-3 w-3" /> Original
        </span>
        <p className="text-lg font-bold font-mono mt-0.5">
          {formatTime(stats.originalDuration)}
        </p>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center backdrop-blur">
        <span className="text-[11px] uppercase tracking-wider text-primary flex items-center justify-center gap-1 font-semibold">
          <Sparkles className="h-3 w-3" /> New Duration
        </span>
        <p className="text-lg font-bold font-mono text-primary mt-0.5">
          {formatTime(stats.processedDuration)}
        </p>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-center backdrop-blur">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
          <Scissors className="h-3 w-3" /> Time Saved
        </span>
        <p className="text-lg font-bold font-mono text-emerald-500 mt-0.5">
          -{formatTime(stats.removedDuration)}
        </p>
      </div>

      <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-center backdrop-blur">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Cuts / Ratio
        </span>
        <p className="text-lg font-bold font-mono mt-0.5">
          {stats.cutsCount}{" "}
          <span className="text-xs text-muted-foreground font-normal">
            ({stats.percentageSaved}%)
          </span>
        </p>
      </div>
    </div>
  );
}
