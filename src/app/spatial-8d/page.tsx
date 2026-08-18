"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Compass,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Download,
  FileAudio,
  Headphones,
  Sparkles,
  Layers,
} from "lucide-react";
import { Spatial8DEngine, Spatial8DOptions } from "@/lib/spatial-8d";
import { AudioConverterEngine } from "@/lib/audio-converter";
import { SpatialOrbitVisualizer } from "@/components/audio/spatial-orbit-visualizer";
import { SpatialPresets } from "@/components/audio/spatial-presets";

export default function Spatial8DPage() {
  const [fileName, setFileName] = useState<string>("");
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(
    null,
  );

  // Параметры 8D пространственной сцены
  const [options, setOptions] = useState<Spatial8DOptions>({
    speedSec: 12,
    radius: 2.2,
    pattern: "circle-cw",
    reverbSpace: "studio",
    reverbWet: 0.25,
    elevation: 0.0,
  });

  // Аудиоплеер и Web Audio Graph
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Состояние экспорта
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [exportFormat, setExportFormat] = useState<"mp3" | "wav">("wav");
  const [exportBitrate, setExportBitrate] = useState<number>(320);

  // Ссылки на Web Audio API узлы
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const pannerNodeRef = useRef<PannerNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const wetGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);

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

  // Запуск воспроизведения через цепочку 8D HRTF-процессинга
  const playAudio = useCallback(
    (offset = 0) => {
      if (!originalBuffer) return;

      stopAudio();
      const ctx = getAudioContext();

      // 1. Создание узлов
      const source = ctx.createBufferSource();
      source.buffer = originalBuffer;

      const panner = ctx.createPanner();
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;
      panner.coneInnerAngle = 360;

      if (ctx.listener.forwardX) {
        ctx.listener.forwardX.setValueAtTime(0, ctx.currentTime);
        ctx.listener.forwardY.setValueAtTime(0, ctx.currentTime);
        ctx.listener.forwardZ.setValueAtTime(-1, ctx.currentTime);
        ctx.listener.upX.setValueAtTime(0, ctx.currentTime);
        ctx.listener.upY.setValueAtTime(1, ctx.currentTime);
        ctx.listener.upZ.setValueAtTime(0, ctx.currentTime);
      }

      // 2. Реверберация
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      const convolver = ctx.createConvolver();

      const reverbDur =
        options.reverbSpace === "cathedral"
          ? 4.0
          : options.reverbSpace === "hall"
            ? 2.5
            : 1.2;
      const reverbDec =
        options.reverbSpace === "cathedral"
          ? 1.5
          : options.reverbSpace === "hall"
            ? 2.2
            : 3.5;

      convolver.buffer = Spatial8DEngine.createSyntheticImpulse(
        ctx,
        reverbDur,
        reverbDec,
      );

      const wetVal = options.reverbSpace === "dry" ? 0 : options.reverbWet;
      dryGain.gain.setValueAtTime(1 - wetVal * 0.5, ctx.currentTime);
      wetGain.gain.setValueAtTime(wetVal, ctx.currentTime);

      // 3. Коммутация графа
      source.connect(panner);
      panner.connect(dryGain);
      panner.connect(convolver);
      convolver.connect(wetGain);

      dryGain.connect(ctx.destination);
      wetGain.connect(ctx.destination);

      pannerNodeRef.current = panner;
      dryGainRef.current = dryGain;
      wetGainRef.current = wetGain;
      convolverRef.current = convolver;
      sourceNodeRef.current = source;

      const clampedOffset = Math.max(
        0,
        Math.min(offset, originalBuffer.duration),
      );
      source.start(0, clampedOffset);

      startTimeRef.current = ctx.currentTime;
      startOffsetRef.current = clampedOffset;
      setIsPlaying(true);

      // Анимационный цикл обновления 3D-координат
      const updatePositionLoop = () => {
        if (!sourceNodeRef.current) return;
        const played = ctx.currentTime - startTimeRef.current;
        const current = startOffsetRef.current + played;

        if (current >= originalBuffer.duration) {
          setCurrentTime(0);
          startOffsetRef.current = 0;
          stopAudio();
        } else {
          setCurrentTime(current);

          // Обновление физических координат PannerNode
          const pos = Spatial8DEngine.calculatePosition(current, options);
          if (pannerNodeRef.current) {
            pannerNodeRef.current.positionX.setValueAtTime(
              pos.x,
              ctx.currentTime,
            );
            pannerNodeRef.current.positionY.setValueAtTime(
              pos.y,
              ctx.currentTime,
            );
            pannerNodeRef.current.positionZ.setValueAtTime(
              pos.z,
              ctx.currentTime,
            );
          }

          animFrameRef.current = requestAnimationFrame(updatePositionLoop);
        }
      };

      animFrameRef.current = requestAnimationFrame(updatePositionLoop);

      source.onended = () => {
        if (
          ctx.currentTime - startTimeRef.current + startOffsetRef.current >=
          originalBuffer.duration
        ) {
          setIsPlaying(false);
          setCurrentTime(0);
          startOffsetRef.current = 0;
        }
      };
    },
    [originalBuffer, options, stopAudio, getAudioContext],
  );

  // Перезапуск нод при смене пресетов на лету
  useEffect(() => {
    if (isPlaying) {
      const pos = currentTime;
      playAudio(pos);
    }
  }, [options.pattern, options.reverbSpace]);

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
      const decoded = await AudioConverterEngine.decodeAudio(file);
      setOriginalBuffer(decoded);
      setDuration(decoded.duration);
      setCurrentTime(0);
      startOffsetRef.current = 0;
    } catch (err: any) {
      console.error("Audio Decode Error:", err);
      alert("Failed to decode audio file. Please check format.");
    }
  };

  // Оффлайн-рендеринг и скачивание готового 8D аудиофайла
  const handleExport = async () => {
    if (!originalBuffer) return;

    try {
      setIsRendering(true);
      setRenderProgress(10);

      // Полный оффлайн-рендеринг 8D-сцены
      const rendered = await Spatial8DEngine.render8D(
        originalBuffer,
        options,
        (pct) => setRenderProgress(pct),
      );

      let blob: Blob;
      if (exportFormat === "wav") {
        blob = await AudioConverterEngine.encodeWav(rendered, 24);
      } else {
        blob = await AudioConverterEngine.encodeMp3(
          rendered,
          exportBitrate as any,
        );
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}_8D_Spatial_${options.pattern}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("8D Render Error:", err);
      alert("Failed to render 8D audio.");
    } finally {
      setIsRendering(false);
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
            <Compass className="w-3.5 h-3.5" />
            <span>360° HRTF Binaural Soundstage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            8D Audio Spatializer & Ambience Engine
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
            Transform stereo music into 360° rotating binaural spatial audio
            with realistic room acoustics.
          </p>
        </div>

        {/* Предупреждение о наушниках */}
        <div className="p-4 rounded-2xl bg-fuchsia-950/30 border border-fuchsia-500/30 flex items-center gap-3.5 text-xs text-fuchsia-200">
          <div className="p-2 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <p className="leading-relaxed">
            <strong className="text-white font-semibold">
              Headphones Required:
            </strong>{" "}
            The 8D binaural effect relies on interaural time and level
            differences (ITD/ILD) and will only be heard accurately through
            stereo headphones.
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
            className="p-10 border-2 border-dashed border-zinc-800 hover:border-fuchsia-500/50 rounded-2xl bg-zinc-900/40 text-center cursor-pointer transition-colors"
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
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-fuchsia-400">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-200 mb-1">
              Drop any song or track here to spatialize
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

        {/* Рабочая панель */}
        {originalBuffer && (
          <div className="space-y-6">
            {/* 3D-Радар Орбиты */}
            <SpatialOrbitVisualizer
              options={options}
              currentTime={currentTime}
              isPlaying={isPlaying}
            />

            {/* Плеер */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-fuchsia-500/10 text-fuchsia-400">
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

                <button
                  type="button"
                  title="Upload Another Track"
                  onClick={() => {
                    stopAudio();
                    setOriginalBuffer(null);
                  }}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white flex items-center justify-center transition-colors shadow-lg shadow-fuchsia-500/20 shrink-0"
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
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
                />
              </div>
            </div>

            {/* Панель пресетов и параметров */}
            <SpatialPresets
              options={options}
              setOptions={setOptions}
              disabled={isRendering}
            />

            {/* Панель экспорта */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select
                  value={exportFormat}
                  onChange={(e: any) => setExportFormat(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-fuchsia-500"
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
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 focus:outline-none focus:border-fuchsia-500"
                  >
                    <option value={320}>320 kbps (High Quality)</option>
                    <option value={256}>256 kbps</option>
                    <option value={192}>192 kbps</option>
                  </select>
                )}
              </div>

              <button
                type="button"
                disabled={isRendering}
                onClick={handleExport}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-fuchsia-500/20 cursor-pointer"
              >
                {isRendering ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Rendering 8D Audio ({renderProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download 8D Audio</span>
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
