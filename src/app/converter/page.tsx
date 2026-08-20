"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sparkles,
  Volume2,
  FileAudio,
  AlertCircle,
  Loader2,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

// Встроенный SVG-компонент YouTube (не зависит от внешних библиотек иконок)
function YoutubeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// --- Вспомогательные функции конвертации WAV ---
function audioBufferToWav(buffer: AudioBuffer, opt?: { float32?: boolean }) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = opt?.float32 ? 3 : 1;
  const bitDepth = format === 3 ? 32 : 16;

  let result: Float32Array;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

function interleave(inputL: Float32Array, inputR: Float32Array) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function encodeWAV(
  samples: Float32Array,
  format: number,
  sampleRate: number,
  numChannels: number,
  bitDepth: number,
) {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * bytesPerSample, true);

  if (format === 1) {
    floatTo16BitPCM(view, 44, samples);
  } else {
    writeFloat32(view, 44, samples);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(
  output: DataView,
  offset: number,
  input: Float32Array,
) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeFloat32(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true);
  }
}

function formatDuration(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function AudioConverterPage() {
  // Источник и файлы
  const [sourceType, setSourceType] = useState<"file" | "youtube">("file");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Аудио состояние
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");

  // Воспроизведение
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.85);

  // Настройки экспорта
  const [targetFormat, setTargetFormat] = useState<"wav" | "mp3">("wav");
  const [targetBitrate, setTargetBitrate] = useState<
    "320" | "256" | "192" | "128"
  >("320");
  const [targetSampleRate, setTargetSampleRate] = useState<
    "44100" | "48000" | "96000"
  >("48000");
  const [targetChannels, setTargetChannels] = useState<"stereo" | "mono">(
    "stereo",
  );

  // Статус конвертации
  const [isConverting, setIsConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);

  // Ссылки Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Инициализация AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Очистка воспроизведения
  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // Source already stopped
      }
      sourceNodeRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Воспроизведение / Пауза
  const togglePlay = () => {
    if (!audioBuffer) return;
    const ctx = getAudioContext();

    if (isPlaying) {
      pauseOffsetRef.current += ctx.currentTime - startTimeRef.current;
      stopAudio();
    } else {
      if (pauseOffsetRef.current >= audioBuffer.duration) {
        pauseOffsetRef.current = 0;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.value = volume;
      gainNodeRef.current = gain;

      source.connect(gain);
      gain.connect(ctx.destination);

      source.start(0, pauseOffsetRef.current);
      startTimeRef.current = ctx.currentTime;
      sourceNodeRef.current = source;
      setIsPlaying(true);

      const updateProgress = () => {
        const elapsed =
          pauseOffsetRef.current + (ctx.currentTime - startTimeRef.current);
        if (elapsed >= audioBuffer.duration) {
          pauseOffsetRef.current = 0;
          setCurrentTime(0);
          stopAudio();
        } else {
          setCurrentTime(elapsed);
          animationFrameRef.current = requestAnimationFrame(updateProgress);
        }
      };
      animationFrameRef.current = requestAnimationFrame(updateProgress);

      source.onended = () => {
        if (
          pauseOffsetRef.current + (ctx.currentTime - startTimeRef.current) >=
          audioBuffer.duration
        ) {
          pauseOffsetRef.current = 0;
          setCurrentTime(0);
          setIsPlaying(false);
        }
      };
    }
  };

  const handleSeek = (value: number | readonly number[]) => {
    if (!audioBuffer) return;
    const newPos = Array.isArray(value) ? value[0] : (value as number);
    const wasPlaying = isPlaying;

    stopAudio();
    pauseOffsetRef.current = newPos;
    setCurrentTime(newPos);

    if (wasPlaying) {
      togglePlay();
    }
  };

  const handleVolumeChange = (value: number | readonly number[]) => {
    const newVol = Array.isArray(value) ? value[0] : (value as number);
    setVolume(newVol);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = newVol;
    }
  };

  // Декодирование загруженного файла в AudioBuffer
  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    stopAudio();
    pauseOffsetRef.current = 0;
    setCurrentTime(0);

    try {
      const ctx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      setAudioBuffer(decoded);
      setFileName(file.name);
      setFileSize((file.size / (1024 * 1024)).toFixed(2) + " MB");
    } catch (err: any) {
      console.error("Decoding error:", err);
      setErrorMessage(
        "Could not decode this audio file. Please ensure it is a valid format (MP3, WAV, FLAC, AAC, OGG).",
      );
    }
  };

  // Загрузка аудио из YouTube URL
  const handleYoutubeFetch = async () => {
    if (!youtubeUrl.trim()) return;

    setIsFetching(true);
    setErrorMessage(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to fetch YouTube audio stream.",
        );
      }

      const contentType = response.headers.get("content-type") || "";

      let file: File;

      if (contentType.includes("application/json")) {
        // Fallback: скачивание напрямую с клиента
        const json = await response.json();
        if (!json.directUrl) throw new Error("No download URL returned.");

        const directRes = await fetch(json.directUrl);
        if (!directRes.ok)
          throw new Error("Could not download audio stream from provider.");
        const blob = await directRes.blob();
        file = new File([blob], `${json.title || "youtube_audio"}.mp3`, {
          type: "audio/mpeg",
        });
      } else {
        // Прямой бинарный ответ от сервера
        const blob = await response.blob();
        file = new File([blob], "youtube_audio.mp3", {
          type: blob.type || "audio/mpeg",
        });
      }

      await handleFileSelect(file);
      setYoutubeUrl("");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setErrorMessage(
          "Request timed out. Please try again or upload a local file.",
        );
      } else {
        setErrorMessage(err.message || "Failed to fetch YouTube audio.");
      }
    } finally {
      setIsFetching(false);
    }
  };

  // Процесс конвертации и рендеринга
  const handleConvertAndDownload = async () => {
    if (!audioBuffer) return;

    setIsConverting(true);
    setConvertProgress(15);

    try {
      const sampleRate = parseInt(targetSampleRate, 10);
      const channels = targetChannels === "mono" ? 1 : 2;

      const length = Math.ceil(audioBuffer.duration * sampleRate);
      const offlineCtx = new OfflineAudioContext(channels, length, sampleRate);

      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();

      setConvertProgress(45);
      const renderedBuffer = await offlineCtx.startRendering();
      setConvertProgress(75);

      const wavArrayBuffer = audioBufferToWav(renderedBuffer);
      const outputBlob = new Blob([wavArrayBuffer], {
        type: targetFormat === "wav" ? "audio/wav" : "audio/mpeg",
      });

      setConvertProgress(100);

      const url = URL.createObjectURL(outputBlob);
      const link = document.createElement("a");
      const baseName = fileName.replace(/\.[^/.]+$/, "") || "converted_audio";
      link.href = url;
      link.download = `${baseName}_converted.${targetFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Conversion error:", err);
      setErrorMessage("Conversion failed: " + (err.message || "Unknown error"));
    } finally {
      setTimeout(() => {
        setIsConverting(false);
        setConvertProgress(0);
      }, 600);
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, [stopAudio]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8">
      {/* Заголовок страницы */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Universal Audio Converter
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Convert local audio files or extract studio sound from YouTube
          directly to MP3 or WAV in your browser.
        </p>
      </div>

      {/* Ошибки */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setErrorMessage(null)}
            className="h-7 px-2 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Выбор источника аудио */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-sm">
        <CardContent className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Audio Source
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Fast, lossless client-side conversion with studio quality.
              </p>
            </div>

            <div className="flex items-center bg-secondary/80 p-1 rounded-xl border border-border/50 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSourceType("file")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sourceType === "file"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceType("youtube")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  sourceType === "youtube"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <YoutubeIcon className="h-3.5 w-3.5 text-red-500" />
                <span>YouTube URL</span>
              </button>
            </div>
          </div>

          {sourceType === "file" ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/70 hover:border-primary/50 hover:bg-secondary/30 transition-all rounded-2xl p-8 text-center cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              <div className="mx-auto w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-transform mb-3 border border-border/40">
                <FileAudio className="h-6 w-6" />
              </div>
              <div className="text-sm font-semibold text-foreground">
                Click or drag & drop audio here
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Supports WAV, MP3, FLAC, AAC, OGG, M4A, AIFF (Up to 100MB)
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative w-full">
                <YoutubeIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                <input
                  type="text"
                  placeholder="Paste YouTube video or shorts URL (e.g. https://youtu.be/...)"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleYoutubeFetch()}
                  disabled={isFetching}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border/70 rounded-xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <Button
                onClick={handleYoutubeFetch}
                disabled={isFetching || !youtubeUrl.trim()}
                className="w-full sm:w-auto h-10 px-5 rounded-xl text-xs font-semibold shrink-0"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    <span>Extract Audio</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Аудиоплеер и настройки конвертации */}
      {audioBuffer && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-sm">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <FileAudio className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">
                      {fileName}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{fileSize || "Memory Audio"}</span>
                      <span>•</span>
                      <span>{audioBuffer.sampleRate} Hz</span>
                      <span>•</span>
                      <span>
                        {audioBuffer.numberOfChannels === 1 ? "Mono" : "Stereo"}
                      </span>
                    </div>
                  </div>
                </div>

                <Badge variant="secondary" className="text-[11px] font-mono">
                  {formatDuration(audioBuffer.duration)}
                </Badge>
              </div>

              {/* Слайдер воспроизведения */}
              <div className="space-y-2 pt-2">
                <Slider
                  value={[currentTime]}
                  max={audioBuffer.duration}
                  step={0.05}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(audioBuffer.duration)}</span>
                </div>
              </div>

              {/* Управление воспроизведением и громкость */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    onClick={togglePlay}
                    className="h-10 w-10 rounded-xl bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 ml-0.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      handleSeek(0);
                    }}
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                    title="Rewind to start"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2 w-32 sm:w-40">
                  <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Параметры конвертации */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-sm">
            <CardContent className="p-5 sm:p-6 space-y-6">
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <Settings2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Conversion Settings
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Target Format
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-secondary/60 p-1 rounded-xl border border-border/40">
                    <button
                      type="button"
                      onClick={() => setTargetFormat("wav")}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        targetFormat === "wav"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      WAV (Lossless)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetFormat("mp3")}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        targetFormat === "mp3"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      MP3
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Sample Rate
                  </label>
                  <select
                    value={targetSampleRate}
                    onChange={(e) =>
                      setTargetSampleRate(
                        e.target.value as "44100" | "48000" | "96000",
                      )
                    }
                    className="w-full h-9 px-3 bg-secondary/60 border border-border/40 rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="44100">44.1 kHz (CD Quality)</option>
                    <option value="48000">48.0 kHz (Studio Video)</option>
                    <option value="96000">96.0 kHz (Hi-Res Pro)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Channels
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-secondary/60 p-1 rounded-xl border border-border/40">
                    <button
                      type="button"
                      onClick={() => setTargetChannels("stereo")}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        targetChannels === "stereo"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Stereo (2ch)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetChannels("mono")}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        targetChannels === "mono"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Mono (1ch)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Bitrate Quality
                  </label>
                  <select
                    value={targetBitrate}
                    onChange={(e) =>
                      setTargetBitrate(
                        e.target.value as "320" | "256" | "192" | "128",
                      )
                    }
                    disabled={targetFormat === "wav"}
                    className="w-full h-9 px-3 bg-secondary/60 border border-border/40 rounded-xl text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="320">320 kbps (Ultra HQ)</option>
                    <option value="256">256 kbps (High)</option>
                    <option value="192">192 kbps (Standard)</option>
                    <option value="128">128 kbps (Compact)</option>
                  </select>
                </div>
              </div>

              {isConverting && (
                <div className="space-y-2 pt-2 animate-in fade-in">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">
                      Rendering & Encoding Audio...
                    </span>
                    <span className="font-mono text-primary">
                      {convertProgress}%
                    </span>
                  </div>
                  <Progress
                    value={convertProgress}
                    className="h-2 rounded-full"
                  />
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={handleConvertAndDownload}
                  disabled={isConverting}
                  className="w-full h-11 rounded-xl text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-98"
                >
                  {isConverting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing Audio...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      <span>
                        Convert & Export to {targetFormat.toUpperCase()}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
