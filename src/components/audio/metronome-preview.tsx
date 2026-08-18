"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Disc, Plus, Minus, HandMetal } from "lucide-react";

interface MetronomePreviewProps {
  bpm: number;
  onBpmChange: (newBpm: number) => void;
  disabled?: boolean;
}

export const MetronomePreview: React.FC<MetronomePreviewProps> = ({
  bpm,
  onBpmChange,
  disabled = false,
}) => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [beatIndicator, setBeatIndicator] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tapTimesRef = useRef<number[]>([]);
  const beatCountRef = useRef<number>(0);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new AudioCtxClass();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Генерация синтезированного клика метронома
  const playClick = useCallback(
    (isAccent: boolean) => {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(isAccent ? 1200 : 800, ctx.currentTime);

      gain.gain.setValueAtTime(1.0, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    },
    [getAudioContext],
  );

  const stopMetronome = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setBeatIndicator(0);
    beatCountRef.current = 0;
  }, []);

  const startMetronome = useCallback(() => {
    stopMetronome();
    if (bpm <= 0) return;

    setIsActive(true);
    const intervalMs = (60 / bpm) * 1000;

    // Первый удар сразу
    beatCountRef.current = 0;
    playClick(true);
    setBeatIndicator(1);

    timerRef.current = setInterval(() => {
      beatCountRef.current = (beatCountRef.current + 1) % 4;
      const isAccent = beatCountRef.current === 0;
      playClick(isAccent);
      setBeatIndicator(beatCountRef.current + 1);
    }, intervalMs);
  }, [bpm, playClick, stopMetronome]);

  // Перезапуск метронома при смене BPM на лету
  useEffect(() => {
    if (isActive) {
      startMetronome();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [bpm, isActive, startMetronome]);

  const toggleMetronome = () => {
    if (isActive) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  // Алгоритм Tap Tempo
  const handleTap = () => {
    const now = performance.now();
    const taps = tapTimesRef.current;

    // Сброс, если пауза между тапами больше 2 секунд
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      tapTimesRef.current = [now];
      return;
    }

    taps.push(now);
    if (taps.length > 5) taps.shift();

    if (taps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      const avgInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round((60000 / avgInterval) * 10) / 10;

      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        onBpmChange(calculatedBpm);
      }
    }
  };

  return (
    <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Disc
            className={`w-4 h-4 ${isActive ? "text-purple-400 animate-spin" : "text-zinc-400"}`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Synchronized Metronome & Tap Tempo
          </span>
        </div>

        {/* 4 Beat Indicators */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((b) => (
            <div
              key={b}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-100 ${
                beatIndicator === b
                  ? b === 1
                    ? "bg-purple-500 scale-125 shadow-sm shadow-purple-500"
                    : "bg-cyan-400 scale-110"
                  : "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Кнопки регулировки темпа */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={toggleMetronome}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isActive
                ? "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
            }`}
          >
            {isActive ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>{isActive ? "Stop Metronome" : "Audition Click"}</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={handleTap}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-850 hover:bg-zinc-750 text-purple-400 border border-purple-500/30 text-xs font-bold active:scale-95 transition-all"
          >
            <HandMetal className="w-3.5 h-3.5" />
            <span>Tap Tempo</span>
          </button>
        </div>

        {/* Half / Double Time Switches */}
        <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onBpmChange(Math.round((bpm / 2) * 10) / 10)}
            className="px-2 py-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            /2 (Half)
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onBpmChange(Math.max(30, Math.round((bpm - 1) * 10) / 10))
            }
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="font-bold text-zinc-100 px-1">{bpm}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              onBpmChange(Math.min(300, Math.round((bpm + 1) * 10) / 10))
            }
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onBpmChange(Math.round(bpm * 2 * 10) / 10)}
            className="px-2 py-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            x2 (Double)
          </button>
        </div>
      </div>
    </div>
  );
};
