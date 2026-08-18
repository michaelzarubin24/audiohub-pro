"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Maximize2,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Download,
  FileAudio,
  Radio,
  Sparkles,
} from "lucide-react";
import {
  StereoWidenerEngine,
  StereoWidenerOptions,
  StereoAnalysisMetrics,
} from "@/lib/stereo-widener";
import { AudioConverterEngine } from "@/lib/audio-converter";
import { GoniometerVisualizer } from "@/components/audio/goniometer-visualizer";
import { StereoControls } from "@/components/audio/stereo-controls";

export default function StereoWidenerPage() {
  const [fileName, setFileName] = useState<string>("");
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(
    null,
  );
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(
    null,
  );

  // Метрики корреляции фаз
  const [metrics, setMetrics] = useState<StereoAnalysisMetrics | null>(null);

  // Параметры Mid/Side
  const [options, setOptions] = useState<StereoWidenerOptions>({
    widthPct: 140,
    bassMonoFreq: 120,
    haasDelayMs: 0,
    midGainDb: 0,
    sideGainDb: 0,
  });

  // Состояние процессинга
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Плеер и A/B режим
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackMode, setPlaybackMode] = useState<"widened" | "original">(
    "widened",
  );
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Экспорт
  const [exportFormat, setExportFormat] = useState<"mp3" | "wav">("wav");
  const [exportBitrate, setExportBitrate] = useState<number>(320);

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
    (offset = 0, mode = playbackMode) => {
      const targetBuf =
        mode === "widened" ? processedBuffer || originalBuffer : originalBuffer;
      if (!targetBuf) return;

      stopAudio();
      const ctx = getAudioContext();

      const source = ctx.createBufferSource();
      source.buffer = targetBuf;
      source.connect(ctx.destination);

      const clampedOffset = Math.max(0, Math.min(offset, targetBuf.duration));
      source.start(0, clampedOffset);

      startTimeRef.current = ctx.currentTime;
      startOffsetRef.current = clampedOffset;
      sourceNodeRef.current = source;
      setIsPlaying(true);

      const updateProgress = () => {
        if (!sourceNodeRef.current) return;
        const played = ctx.currentTime - startTimeRef.current;
        const current = startOffsetRef.current + played;

        if (current >= targetBuf.duration) {
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
          targetBuf.duration
        ) {
          setIsPlaying(false);
          setCurrentTime(0);
          startOffsetRef.current = 0;
        }
      };
    },
    [processedBuffer, originalBuffer, playbackMode, stopAudio, getAudioContext],
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

  const handleToggleMode = (mode: "original" | "widened") => {
    setPlaybackMode(mode);
    if (isPlaying) {
      playAudio(currentTime, mode);
    }
  };

  // Перерасчет Mid/Side обработки при смене настроек
  const processAudio = useCallback(
    async (buf = originalBuffer, opts = options) => {
      if (!buf) return;
      setIsProcessing(true);

      try {
        const result = await StereoWidenerEngine.process(buf, opts);
        setProcessedBuffer(result);

        // Анализ корреляции фаз обработанного сигнала
        const left = result.getChannelData(0);
        const right =
          result.numberOfChannels > 1 ? result.getChannelData(1) : left;
        const calculatedMetrics = StereoWidenerEngine.calculateCorrelation(
          left,
          right,
        );
        setMetrics(calculatedMetrics);
      } catch (err: any) {
        console.error("Stereo Processing Error:", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [originalBuffer, options],
  );

  useEffect(() => {
    if (originalBuffer) {
      processAudio(originalBuffer, options);
    }
  }, [options, originalBuffer, processAudio]);

  const handleFileSelect = async (file: File) => {
    try {
      stopAudio();
      setFileName(file.name.replace(/\.[^/.]+$/, ""));
      setIsProcessing(true);

      const decoded = await AudioConverterEngine.decodeAudio(file);
      setOriginalBuffer(decoded);
      setDuration(decoded.duration);
      setCurrentTime(0);
      startOffsetRef.current = 0;

      await processAudio(decoded, options);
    } catch (err: any) {
      console.error("Audio Decode Error:", err);
      alert("Failed to decode audio file. Please check format.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    const targetBuf = processedBuffer || originalBuffer;
    if (!targetBuf) return;

    try {
      setIsExporting(true);
      let blob: Blob;

      if (exportFormat === "wav") {
        blob = await AudioConverterEngine.encodeWav(targetBuf, 24);
      } else {
        blob = await AudioConverterEngine.encodeMp3(
          targetBuf,
          exportBitrate as any,
        );
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}_widened_${options.widthPct}pct.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export Error:", err);
      alert("Failed to export widened audio.");
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Заголовок */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Radio className="w-3.5 h-3.5" />
            <span>Mid/Side DSP & Phase Correlation Standard</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Stereo Widener & Phase Checker
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Expand soundstage width, mono-filter low-end bass, and inspect phase
            cancellation in real time.
          </p>
        </div>

        {/* Дропзона загрузки */}
        {!originalBuffer && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0])
                handleFileSelect(e.dataTransfer.files[0]);
            }}
            className="p-10 border-2 border-dashed border-zinc-800 hover:border-sky-500/50 rounded-2xl bg-zinc-900/40 text-center cursor-pointer transition-colors"
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
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-sky-400">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-200 mb-1">
              Drop your mix, master, or sample here
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              Supports WAV, MP3, FLAC, AIFF, OGG, M4A up to 90 minutes. 100%
              processed locally in your browser.
            </p>
            <span className="inline-flex items-center px-4 py-2 text-xs font-semibold bg-zinc-800 hover:bg-zinc-750 text-zinc-200 rounded-xl border border-zinc-700">
              Browse Audio File
            </span>
          </div>
        )}

        {/* Рабочая панель */}
        {originalBuffer && (
          <div className="space-y-6">
            {/* Аудиоплеер и A/B Switcher */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
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

                {/* A/B Switcher */}
                <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleMode("original")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      playbackMode === "original"
                        ? "bg-zinc-800 text-zinc-100 shadow"
                        : "text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    Original (Raw)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleMode("widened")}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      playbackMode === "widened"
                        ? "bg-sky-600 text-white shadow"
                        : "text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    Widened Master
                  </button>
                </div>
              </div>

              {/* Скруббер и Play */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-sky-500/20 shrink-0"
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
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />

                <button
                  type="button"
                  title="Upload Another Track"
                  onClick={() => {
                    stopAudio();
                    setOriginalBuffer(null);
                    setProcessedBuffer(null);
                  }}
                  className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lissajous Vector Scope & Phase Meter */}
            <GoniometerVisualizer
              buffer={
                playbackMode === "widened" ? processedBuffer : originalBuffer
              }
              currentTime={currentTime}
              isPlaying={isPlaying}
              metrics={metrics}
            />

            {/* Параметры Mid/Side и Mono-Maker */}
            <StereoControls
              options={options}
              setOptions={setOptions}
              disabled={isProcessing}
            />

            {/* Панель экспорта */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={exportFormat}
                  onChange={(e: any) => setExportFormat(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="wav">
                    WAV (24-bit Lossless Studio Master)
                  </option>
                  <option value="mp3">MP3 (Universal Web Compressed)</option>
                </select>

                {exportFormat === "mp3" && (
                  <select
                    value={exportBitrate}
                    onChange={(e: any) =>
                      setExportBitrate(parseInt(e.target.value))
                    }
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value={320}>320 kbps (High Quality)</option>
                    <option value={256}>256 kbps</option>
                    <option value={192}>192 kbps</option>
                  </select>
                )}
              </div>

              <button
                type="button"
                disabled={isExporting || isProcessing}
                onClick={handleExport}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Exporting Master...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Widened Audio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
