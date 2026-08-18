"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Gauge,
  Upload,
  Play,
  Pause,
  RotateCcw,
  FileAudio,
  Copy,
  Check,
  Sparkles,
  Music,
  Compass,
} from "lucide-react";
import {
  BpmKeyDetectorEngine,
  TrackAnalysisResult,
} from "@/lib/bpm-key-detector";
import { AudioConverterEngine } from "@/lib/audio-converter";
import { CamelotWheelCard } from "@/components/audio/camelot-wheel-card";
import { MetronomePreview } from "@/components/audio/metronome-preview";

export default function BpmKeyDetectorPage() {
  const [fileName, setFileName] = useState<string>("");
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<TrackAnalysisResult | null>(null);
  const [currentBpm, setCurrentBpm] = useState<number>(120);

  // Состояние анализа
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [, setAnalyzeProgress] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Аудиоплеер
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

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

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playAudio = useCallback(
    (offset = 0) => {
      if (!audioBuffer) return;

      stopAudio();
      const ctx = getAudioContext();

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const clampedOffset = Math.max(0, Math.min(offset, audioBuffer.duration));
      source.start(0, clampedOffset);

      startTimeRef.current = ctx.currentTime;
      startOffsetRef.current = clampedOffset;
      sourceNodeRef.current = source;
      setIsPlaying(true);

      const updateProgress = () => {
        if (!sourceNodeRef.current) return;
        const played = ctx.currentTime - startTimeRef.current;
        const current = startOffsetRef.current + played;

        if (current >= audioBuffer.duration) {
          setCurrentTime(0);
          startOffsetRef.current = 0;
          stopAudio();
        } else {
          setCurrentTime(current);
          animFrameRef.current = requestAnimationFrame(updateProgress);
        }
      };

      animFrameRef.current = requestAnimationFrame(updateProgress);

      source.onended = () => {
        if (
          ctx.currentTime - startTimeRef.current + startOffsetRef.current >=
          audioBuffer.duration
        ) {
          setIsPlaying(false);
          setCurrentTime(0);
          startOffsetRef.current = 0;
        }
      };
    },
    [audioBuffer, stopAudio, getAudioContext],
  );

  const togglePlay = () => {
    if (isPlaying) {
      const ctx = getAudioContext();
      startOffsetRef.current =
        startOffsetRef.current + (ctx.currentTime - startTimeRef.current);
      stopAudio();
    } else {
      playAudio(startOffsetRef.current);
    }
  };

  const handleFileSelect = async (file: File) => {
    try {
      stopAudio();
      setFileName(file.name.replace(/\.[^/.]+$/, ""));
      setIsAnalyzing(true);
      setAnalyzeProgress(15);

      const decoded = await AudioConverterEngine.decodeAudio(file);
      setAudioBuffer(decoded);
      setDuration(decoded.duration);
      setCurrentTime(0);
      startOffsetRef.current = 0;

      // Анализ BPM и тональности
      const results = await BpmKeyDetectorEngine.analyze(decoded, (pct) =>
        setAnalyzeProgress(pct),
      );

      setAnalysisResult(results);
      setCurrentBpm(results.bpm.bpm);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      alert("Failed to analyze audio track. Please check file format.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyMeta = () => {
    if (!analysisResult) return;
    const text = `${analysisResult.bpm.bpm} BPM • ${analysisResult.key.camelot} (${analysisResult.key.fullKey})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Заголовок страницы */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Gauge className="w-3.5 h-3.5" />
            <span>Krumhansl-Schmuckler & Camelot Standard</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            BPM & Musical Key Detector
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Accurate tempo tracking, musical key signature detection, and
            Camelot wheel harmonic mixing guides.
          </p>
        </div>

        {/* Дропзона загрузки */}
        {!audioBuffer && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0])
                handleFileSelect(e.dataTransfer.files[0]);
            }}
            className="p-10 border-2 border-dashed border-zinc-800 hover:border-purple-500/50 rounded-2xl bg-zinc-900/40 text-center cursor-pointer transition-colors"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "audio/*";
              input.onchange = (e: any) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              };
              input.click();
            }}
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-purple-400">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-200 mb-1">
              Drop your track or stem here to analyze
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              Supports MP3, WAV, FLAC, AIFF, OGG, M4A up to 90 minutes. 100%
              processed locally in your browser.
            </p>
            <span className="inline-flex items-center px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl border border-zinc-700">
              Browse Audio File
            </span>
          </div>
        )}

        {/* Рабочая панель с результатами */}
        {audioBuffer && analysisResult && (
          <div className="space-y-6">
            {/* 1. Главные Hero-плашки (BPM + Key + Camelot) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* BPM Hero Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-purple-500/30 flex items-center justify-between shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <Gauge className="w-4 h-4 text-purple-400" />
                    <span>Track Tempo</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white font-mono tracking-tight">
                      {currentBpm}
                    </span>
                    <span className="text-lg font-bold text-purple-400">
                      BPM
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 block">
                    Transient Peak Autocorrelation
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Sparkles className="w-8 h-8" />
                </div>
              </div>

              {/* Key Hero Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-cyan-500/30 flex items-center justify-between shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>Key & Camelot</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white font-mono">
                      {analysisResult.key.fullKey}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono font-bold text-sm">
                      {analysisResult.key.camelot}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 block">
                    Relative: {analysisResult.key.relativeKey}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Music className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* 2. Аудиоплеер трека */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 line-clamp-1">
                      {fileName}
                    </h3>
                    <span className="text-xs font-mono text-zinc-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyMeta}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span>{copied ? "Copied!" : "Copy Meta"}</span>
                  </button>

                  <button
                    type="button"
                    title="Upload Another Track"
                    onClick={() => {
                      stopAudio();
                      setAudioBuffer(null);
                      setAnalysisResult(null);
                    }}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-purple-500/20 shrink-0"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) => {
                    const pos = parseFloat(e.target.value);
                    setCurrentTime(pos);
                    startOffsetRef.current = pos;
                    if (isPlaying) playAudio(pos);
                  }}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>

            {/* 3. Синхронизированный Метроном */}
            <MetronomePreview
              bpm={currentBpm}
              onBpmChange={(newBpm) => setCurrentBpm(newBpm)}
              disabled={isAnalyzing}
            />

            {/* 4. Матрица Camelot Wheel & Спектр высот */}
            <CamelotWheelCard keyData={analysisResult.key} />
          </div>
        )}
      </div>
    </div>
  );
}
