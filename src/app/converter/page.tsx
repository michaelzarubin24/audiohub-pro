"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Loader2, UploadCloud, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { PlayerControls } from "@/components/audio/player-controls";
import { FormatSelector } from "@/components/audio/format-selector";
import {
  YouTubeInputCard,
  YouTubeVideoInfo,
} from "@/components/audio/youtube-input-card";
import { AudioConverterEngine, ConversionOptions } from "@/lib/audio-converter";

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function ConverterPage() {
  // Режим источника (локальный файл или YouTube)
  const [sourceType, setSourceType] = useState<"file" | "youtube">("file");

  // Состояние файла / YouTube
  const [file, setFile] = useState<File | null>(null);
  const [ytInfo, setYtInfo] = useState<YouTubeVideoInfo | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [trackTitle, setTrackTitle] = useState<string>("");

  // Опции конвертации
  const [options, setOptions] = useState<ConversionOptions>({
    format: "mp3",
    bitrate: 320,
    sampleRate: 0,
    channels: "stereo",
  });

  // Загрузка и прогресс
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [convertProgress, setConvertProgress] = useState(0);

  // Плеер
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    return audioCtxRef.current;
  };

  // Очистка воспроизведения
  const stopAudio = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // 1. Загрузка и декодирование локального файла
  useEffect(() => {
    if (sourceType !== "file" || !file) {
      if (sourceType === "file") {
        stopAudio();
        setAudioBuffer(null);
        setDuration(0);
        setCurrentTime(0);
      }
      return;
    }

    let isCancelled = false;

    const loadLocal = async () => {
      try {
        stopAudio();
        setIsLoadingAudio(true);

        const buf = await AudioConverterEngine.decodeAudio(file);
        if (isCancelled) return;

        setAudioBuffer(buf);
        setDuration(buf.duration);
        setCurrentTime(0);
        startOffsetRef.current = 0;
        setTrackTitle(file.name.replace(/\.[^/.]+$/, ""));
      } catch (err) {
        console.error("Failed to decode local file:", err);
      } finally {
        if (!isCancelled) setIsLoadingAudio(false);
      }
    };

    loadLocal();

    return () => {
      isCancelled = true;
    };
  }, [file, sourceType]);

  // 2. Загрузка и декодирование аудиопотока из YouTube
  const handleYouTubeLoaded = async (info: YouTubeVideoInfo) => {
    try {
      stopAudio();
      setYtInfo(info);
      setIsLoadingAudio(true);
      setTrackTitle(info.title);

      const response = await fetch(
        `/api/youtube?url=${encodeURIComponent(info.url)}`,
      );
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok || contentType.includes("application/json")) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || "Failed to stream audio from YouTube server.",
        );
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Received empty audio stream from server.");
      }

      const buf = await AudioConverterEngine.decodeAudio(blob);

      setAudioBuffer(buf);
      setDuration(buf.duration);
      setCurrentTime(0);
      startOffsetRef.current = 0;
    } catch (err: any) {
      console.error("Failed to fetch YouTube audio stream:", err);
      alert(err.message || "Failed to load audio stream.");
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // 3. Управление плеером
  const updateLoop = () => {
    if (!audioCtxRef.current || !duration) return;

    const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
    const currentPos = startOffsetRef.current + elapsed;

    if (currentPos >= duration) {
      stopAudio();
      setCurrentTime(0);
      startOffsetRef.current = 0;
      return;
    }

    setCurrentTime(currentPos);
    animFrameRef.current = requestAnimationFrame(updateLoop);
  };

  const togglePlay = async () => {
    if (!audioBuffer || isConverting) return;
    const ctx = getAudioContext();

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (isPlaying) {
      stopAudio();
      startOffsetRef.current = currentTime;
    } else {
      stopAudio();

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      sourceNodeRef.current = source;
      gainNodeRef.current = gain;

      startTimeRef.current = ctx.currentTime;
      source.start(0, currentTime);
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(updateLoop);
    }
  };

  const handleSeek = (timeSec: number) => {
    if (!audioBuffer || isConverting) return;
    const wasPlaying = isPlaying;
    stopAudio();

    const safe = Math.max(0, Math.min(timeSec, duration));
    setCurrentTime(safe);
    startOffsetRef.current = safe;

    if (wasPlaying) {
      const ctx = getAudioContext();
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      sourceNodeRef.current = source;
      gainNodeRef.current = gain;

      startTimeRef.current = ctx.currentTime;
      source.start(0, safe);
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(updateLoop);
    }
  };

  const handleReset = () => {
    stopAudio();
    setCurrentTime(0);
    startOffsetRef.current = 0;
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        newVol,
        audioCtxRef.current.currentTime,
      );
    }
  };

  // 4. Конвертация и скачивание
  const handleDownload = async () => {
    if (!audioBuffer || isConverting) return;

    try {
      stopAudio();
      setIsConverting(true);
      setConvertProgress(0);

      const convertedBlob = await AudioConverterEngine.convert(
        audioBuffer,
        options,
        (pct) => setConvertProgress(pct),
      );

      const safeBase = (trackTitle || "converted_audio").replace(
        /[/\\?%*:|"<>]/g,
        "_",
      );
      const filename = `${safeBase}.${options.format}`;

      const downloadUrl = URL.createObjectURL(convertedBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Conversion failed:", err);
    } finally {
      setIsConverting(false);
      setConvertProgress(0);
    }
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Universal Audio Converter
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Convert local audio files or extract studio sound from YouTube
          directly to MP3 or WAV.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Audio Source</CardTitle>
              <CardDescription>
                Fast, lossless client-side conversion with studio quality.
              </CardDescription>
            </div>

            {/* Переключатель источника (File vs YouTube) */}
            <div className="flex items-center rounded-lg border border-border/80 bg-secondary/30 p-1">
              <Button
                variant={sourceType === "file" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  stopAudio();
                  setSourceType("file");
                }}
                disabled={isConverting || isLoadingAudio}
                className="h-7 px-3 text-xs font-semibold gap-1.5"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload File
              </Button>
              <Button
                variant={sourceType === "youtube" ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  stopAudio();
                  setSourceType("youtube");
                }}
                disabled={isConverting || isLoadingAudio}
                className="h-7 px-3 text-xs font-semibold gap-1.5"
              >
                <YouTubeIcon className="h-3.5 w-3.5 text-red-500" />
                YouTube URL
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 1. Блок выбора источника */}
          {sourceType === "file" ? (
            <FileDropzone selectedFile={file} onFileSelect={setFile} />
          ) : (
            <YouTubeInputCard
              onVideoLoaded={handleYouTubeLoaded}
              isLoading={isLoadingAudio}
              disabled={isConverting}
            />
          )}

          {/* Индикатор загрузки/декодирования дорожки */}
          {isLoadingAudio && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs font-medium text-primary animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Fetching and decoding audio stream...</span>
            </div>
          )}

          {/* 2. Плеер и панель настроек при наличии декодированного звука */}
          {audioBuffer && !isLoadingAudio && (
            <div className="space-y-6 pt-2">
              {/* Плеер предпрослушивания */}
              <PlayerControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                onPlayToggle={togglePlay}
                onSeek={handleSeek}
                onReset={handleReset}
                onVolumeChange={handleVolumeChange}
                disabled={isConverting}
              />

              {/* Панель выбора формата */}
              <FormatSelector
                options={options}
                onChange={setOptions}
                disabled={isConverting}
              />

              {/* Блок конвертации и скачивания */}
              <div className="space-y-3 pt-2">
                {isConverting ? (
                  <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Converting to {options.format.toUpperCase()} (
                      {convertProgress}%)...
                    </div>
                    <Progress value={convertProgress} className="h-2" />
                  </div>
                ) : (
                  <Button
                    onClick={handleDownload}
                    disabled={isConverting || isLoadingAudio}
                    className="w-full py-6 text-base font-semibold shadow-md transition-all active:scale-[0.99]"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Download {options.format.toUpperCase()}
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
