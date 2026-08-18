"use client";

import React, { useRef, useEffect } from "react";
import { Headphones, Waves } from "lucide-react";
import { Spatial8DOptions, Spatial8DEngine } from "@/lib/spatial-8d";

interface SpatialOrbitVisualizerProps {
  options: Spatial8DOptions;
  currentTime: number;
  isPlaying: boolean;
}

export const SpatialOrbitVisualizer: React.FC<SpatialOrbitVisualizerProps> = ({
  options,
  currentTime,
  isPlaying,
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
    const scale = (width / 2 - 36) / 3.5; // масштаб отображения радиуса

    ctx.clearRect(0, 0, width, height);

    // 1. Сетка радара (концентрические окружности)
    ctx.strokeStyle = "rgba(63, 63, 70, 0.4)";
    ctx.lineWidth = 1;

    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Осевые направляющие (L / R / Front / Back)
    ctx.strokeStyle = "rgba(63, 63, 70, 0.3)";
    ctx.beginPath();
    ctx.moveTo(centerX, 10);
    ctx.lineTo(centerX, height - 10);
    ctx.moveTo(10, centerY);
    ctx.lineTo(width - 10, centerY);
    ctx.stroke();

    // Метки сторон
    ctx.fillStyle = "rgba(161, 161, 170, 0.6)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("FRONT", centerX, 18);
    ctx.fillText("BACK", centerX, height - 8);
    ctx.textAlign = "left";
    ctx.fillText("L", 12, centerY - 6);
    ctx.textAlign = "right";
    ctx.fillText("R", width - 12, centerY - 6);

    // 2. Отрисовка траектории орбиты
    ctx.beginPath();
    ctx.strokeStyle = "rgba(168, 85, 247, 0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    const numPoints = 120;
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * options.speedSec;
      const pt = Spatial8DEngine.calculatePosition(t, options);
      const canvasX = centerX + pt.x * scale;
      const canvasY = centerY + pt.z * scale;

      if (i === 0) ctx.moveTo(canvasX, canvasY);
      else ctx.lineTo(canvasX, canvasY);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Вычисление текущего положения источника звука
    const currentPos = Spatial8DEngine.calculatePosition(currentTime, options);
    const soundX = centerX + currentPos.x * scale;
    const soundY = centerY + currentPos.z * scale;

    // Шлейф / Линия от центра к источнику
    const gradient = ctx.createLinearGradient(centerX, centerY, soundX, soundY);
    gradient.addColorStop(0, "rgba(168, 85, 247, 0.05)");
    gradient.addColorStop(1, "rgba(217, 70, 239, 0.6)");

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(soundX, soundY);
    ctx.stroke();

    // 4. Пульсирующий источник звука
    if (isPlaying) {
      ctx.beginPath();
      ctx.arc(soundX, soundY, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(217, 70, 239, 0.25)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(soundX, soundY, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#ec4899";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 5. Голова слушателя в центре
    ctx.beginPath();
    ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
    ctx.fillStyle = "#18181b";
    ctx.fill();
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [options, currentTime, isPlaying]);

  return (
    <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-950/80 border border-zinc-800/80">
      <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
        <Waves className="w-3.5 h-3.5 text-fuchsia-400" />
        <span>360° HRTF Soundstage Radar</span>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="rounded-full shadow-inner"
        />

        {/* Иконка наушников в центре */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-fuchsia-400">
          <Headphones className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[11px] font-mono text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-fuchsia-500 animate-pulse" />
          Moving Audio Source
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          Listener Position
        </span>
      </div>
    </div>
  );
};
