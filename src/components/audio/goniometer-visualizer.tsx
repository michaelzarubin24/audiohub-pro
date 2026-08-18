"use client";

import React, { useRef, useEffect } from "react";
import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { StereoAnalysisMetrics } from "@/lib/stereo-widener";

interface GoniometerVisualizerProps {
  buffer: AudioBuffer | null;
  currentTime: number;
  isPlaying: boolean;
  metrics: StereoAnalysisMetrics | null;
}

export const GoniometerVisualizer: React.FC<GoniometerVisualizerProps> = ({
  buffer,
  currentTime,
  isPlaying,
  metrics,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // 1. Отрисовка координатной сетки и направляющих
    ctx.strokeStyle = "rgba(63, 63, 70, 0.4)";
    ctx.lineWidth = 1;

    // Внешняя и внутренняя окружности
    ctx.beginPath();
    ctx.arc(centerX, centerY, width / 2 - 20, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, (width / 2 - 20) * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Диагональные оси стереополя (L / R)
    ctx.strokeStyle = "rgba(63, 63, 70, 0.5)";
    ctx.beginPath();
    // Ось Left-Right (+45 / -45 градусов)
    ctx.moveTo(25, 25);
    ctx.lineTo(width - 25, height - 25);
    ctx.moveTo(width - 25, 25);
    ctx.lineTo(25, height - 25);
    // Вертикальная Mid (Mono) и горизонтальная Side (Stereo)
    ctx.moveTo(centerX, 15);
    ctx.lineTo(centerX, height - 15);
    ctx.moveTo(15, centerY);
    ctx.lineTo(width - 15, centerY);
    ctx.stroke();

    // Метки каналов
    ctx.fillStyle = "rgba(161, 161, 170, 0.7)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("+M (Mono)", centerX, 12);
    ctx.fillText("-M", centerX, height - 4);
    ctx.fillText("L", 18, 22);
    ctx.fillText("R", width - 18, 22);
    ctx.fillText("+S (Wide)", width - 26, centerY - 4);

    // 2. Отрисовка векторного облака сэмплов (Lissajous Phase Scope)
    if (buffer && isPlaying) {
      const sampleRate = buffer.sampleRate;
      const leftData = buffer.getChannelData(0);
      const rightData =
        buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftData;

      const startSample = Math.floor(currentTime * sampleRate);
      const windowSamples = 1024;
      const scale = (width / 2 - 30) * 0.85;

      ctx.fillStyle = "rgba(56, 189, 248, 0.45)"; // Sky blue cloud

      for (let i = 0; i < windowSamples; i += 2) {
        const idx = startSample + i;
        if (idx >= leftData.length) break;

        const l = leftData[idx];
        const r = rightData[idx];

        // Поворот системы координат на 45 градусов:
        // X = (R - L) * cos(45°), Y = (R + L) * sin(45°)
        const x = centerX + (r - l) * 0.7071 * scale;
        const y = centerY - (l + r) * 0.7071 * scale;

        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
  }, [buffer, currentTime, isPlaying]);

  const correlation = metrics?.correlation ?? 1.0;
  const isHealthy = correlation >= 0.3;
  const isWarning = correlation >= 0.0 && correlation < 0.3;
  const isDanger = correlation < 0.0;

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Lissajous Vector Scope & Phase Meter
            </h3>
            <span className="text-xs text-zinc-400">
              Real-time Stereo Field & Mono-Compatibility Analysis
            </span>
          </div>
        </div>

        {/* Phase Health Badge */}
        <div className="flex items-center gap-2">
          {isHealthy && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mono-Safe Phase (+{correlation})</span>
            </span>
          )}
          {isWarning && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Wide Mix (+{correlation})</span>
            </span>
          )}
          {isDanger && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Phase Cancellation ({correlation})</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Goniometer Canvas */}
        <div className="flex justify-center">
          <div className="relative p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800">
            <canvas
              ref={canvasRef}
              width={260}
              height={260}
              className="rounded-xl shadow-inner"
            />
          </div>
        </div>

        {/* Phase Correlation & Balance Meters */}
        <div className="space-y-5">
          {/* 1. Correlation Bar (-1.0 to +1.0) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-zinc-300">Phase Correlation Factor</span>
              <span className="font-mono text-sky-400 font-bold">
                {correlation > 0 ? `+${correlation}` : correlation}
              </span>
            </div>

            <div className="relative h-4 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden flex">
              {/* Левая зона (Out of Phase - Красная) */}
              <div className="w-1/2 h-full bg-gradient-to-r from-rose-600/30 to-amber-500/20 relative border-r border-zinc-700">
                <span className="absolute left-2 top-0.5 text-[9px] font-mono text-rose-400">
                  -1 (Cancel)
                </span>
              </div>
              {/* Правая зона (In Phase - Зеленая) */}
              <div className="w-1/2 h-full bg-gradient-to-r from-amber-500/20 to-emerald-500/30 relative">
                <span className="absolute right-2 top-0.5 text-[9px] font-mono text-emerald-400">
                  +1 (Solid)
                </span>
              </div>

              {/* Маркер текущего значения */}
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-white shadow-md transition-all duration-150"
                style={{
                  left: `${Math.max(0, Math.min(100, ((correlation + 1) / 2) * 100))}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>Phase Issue</span>
              <span>0 (Wide Stereo)</span>
              <span>Perfect Mono</span>
            </div>
          </div>

          {/* 2. L/R Stereo Balance */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-zinc-300">Stereo Center Balance</span>
              <span className="font-mono text-zinc-400">
                {metrics?.stereoBalance === 0
                  ? "Center (0.0)"
                  : metrics?.stereoBalance! < 0
                    ? `Left ${Math.round(Math.abs(metrics?.stereoBalance!) * 100)}%`
                    : `Right ${Math.round(metrics?.stereoBalance! * 100)}%`}
              </span>
            </div>

            <div className="relative h-2 rounded-full bg-zinc-950 border border-zinc-800 overflow-hidden">
              <div
                className="absolute top-0 bottom-0 w-2 rounded-full bg-sky-400"
                style={{
                  left: `${Math.max(0, Math.min(100, (((metrics?.stereoBalance ?? 0) + 1) / 2) * 100))}%`,
                }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed">
            💡 <strong>Pro Tip:</strong> Values between <strong>+0.5</strong>{" "}
            and <strong>+1.0</strong> ensure your mix will play clearly on
            smartphones, mono Bluetooth speakers, and club sound systems without
            elements vanishing.
          </div>
        </div>
      </div>
    </div>
  );
};
