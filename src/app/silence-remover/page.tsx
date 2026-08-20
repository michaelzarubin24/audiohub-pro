"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { PlayerControls } from "@/components/audio/player-controls";
import { SilenceControls } from "@/components/audio/silence-controls";
import { SilenceStatsCard } from "@/components/audio/silence-stats-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SilenceRemoverEngine,
  SilenceOptions,
  ProcessedAudioResult,
} from "@/lib/silence-remover";
import { AudioExportFormat } from "@/lib/soundtouch-engine";
import { AdBanner } from "@/components/shared/ad-banner";

export default function SilenceRemoverPage() {
  const [file, setFile] = useState<File | null>(null);

  // Параметры тишины
  const [thresholdDb, setThresholdDb] = useState(-40);
  const [minSilenceMs, setMinSilenceMs] = useState(300);
  const [paddingMs, setPaddingMs] = useState(50);

  // Результат обработки
  const [rawBuffer, setRawBuffer] = useState<AudioBuffer | null>(null);
  const [processedResult, setProcessedResult] =
    useState<ProcessedAudioResult | null>(null);
  const [isProcessing, startTransition] = useTransition();

  // Состояние воспроизведения
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);

  // Экспорт
  const [exportFormat, setExportFormat] = useState<AudioExportFormat>("mp3");
  const [isExporting, setIsExporting] = useState(false);

  // Web Audio Context & Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Инициализация AudioContext
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

  // 1. Декодирование оригинального файла
  useEffect(() => {
    if (!file) {
      stopPlayback();
      setRawBuffer(null);
      setProcessedResult(null);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      try {
        stopPlayback();
        const ctx = getAudioContext();
        const arrayBuf = await file.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);

        if (isCancelled) return;
        setRawBuffer(audioBuf);
      } catch (err) {
        console.error("Failed to decode audio file:", err);
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  // 2. Пересчет и сшивание при изменении параметров
  useEffect(() => {
    if (!rawBuffer) return;

    startTransition(() => {
      stopPlayback();
      const ctx = getAudioContext();
      const options: SilenceOptions = { thresholdDb, minSilenceMs, paddingMs };
      const res = SilenceRemoverEngine.process(rawBuffer, options, ctx);
      setProcessedResult(res);
      setCurrentTime(0);
      startOffsetRef.current = 0;
    });
  }, [rawBuffer, thresholdDb, minSilenceMs, paddingMs]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Управление воспроизведением
  const stopPlayback = () => {
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

  const updateProgress = () => {
    if (!audioCtxRef.current || !processedResult) return;

    const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
    const currentPos = startOffsetRef.current + elapsed;
    const totalDuration = processedResult.stats.processedDuration;

    if (currentPos >= totalDuration) {
      stopPlayback();
      setCurrentTime(0);
      startOffsetRef.current = 0;
      return;
    }

    setCurrentTime(currentPos);
    animFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const togglePlay = async () => {
    if (!processedResult) return;
    const ctx = getAudioContext();

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (isPlaying) {
      stopPlayback();
      startOffsetRef.current = currentTime;
    } else {
      stopPlayback();

      const source = ctx.createBufferSource();
      source.buffer = processedResult.audioBuffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      sourceNodeRef.current = source;
      gainNodeRef.current = gain;

      startTimeRef.current = ctx.currentTime;
      source.start(0, currentTime);
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const handleSeek = (newTime: number) => {
    if (!processedResult) return;
    const wasPlaying = isPlaying;
    stopPlayback();

    const safe = Math.max(
      0,
      Math.min(newTime, processedResult.stats.processedDuration),
    );
    setCurrentTime(safe);
    startOffsetRef.current = safe;

    if (wasPlaying) {
      const ctx = getAudioContext();
      const source = ctx.createBufferSource();
      source.buffer = processedResult.audioBuffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      sourceNodeRef.current = source;
      gainNodeRef.current = gain;

      startTimeRef.current = ctx.currentTime;
      source.start(0, safe);
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  };

  const handleReset = () => {
    stopPlayback();
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

  // Скачивание обработанного файла
  const handleDownload = () => {
    if (!processedResult || !file || isExporting) return;

    try {
      setIsExporting(true);
      const { samplesL, samplesR, audioBuffer } = processedResult;

      const blob = SilenceRemoverEngine.exportFile(
        samplesL,
        samplesR,
        audioBuffer.sampleRate,
        exportFormat,
      );

      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const outputFilename = `${baseName}_trimmed.${exportFormat}`;

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = outputFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Silence export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Audio Silence Remover
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Automatically detect and cut out silent pauses and dead air from
          podcasts and tracks.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Audio Track</CardTitle>
          <CardDescription>
            Instant in-memory trimming with anti-click micro-crossfades — 100%
            private.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileDropzone selectedFile={file} onFileSelect={setFile} />

          {file && (
            <div className="space-y-6">
              {/* Статистика вырезанной тишины */}
              {processedResult && (
                <SilenceStatsCard stats={processedResult.stats} />
              )}

              {/* Слайдеры настройки параметров */}
              <SilenceControls
                thresholdDb={thresholdDb}
                minSilenceMs={minSilenceMs}
                paddingMs={paddingMs}
                onThresholdChange={setThresholdDb}
                onMinSilenceChange={setMinSilenceMs}
                onPaddingChange={setPaddingMs}
                onReset={() => {
                  setThresholdDb(-40);
                  setMinSilenceMs(300);
                  setPaddingMs(50);
                }}
                disabled={!processedResult || isProcessing}
              />

              {/* Плеер предпрослушивания результата */}
              {processedResult && (
                <PlayerControls
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={processedResult.stats.processedDuration}
                  volume={volume}
                  onPlayToggle={togglePlay}
                  onSeek={handleSeek}
                  onReset={handleReset}
                  onVolumeChange={handleVolumeChange}
                  disabled={isProcessing}
                />
              )}

              {/* Выбор формата и кнопка Download */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Export Format:
                  </span>
                  <div className="flex items-center rounded-lg border border-border/80 bg-secondary/30 p-1">
                    <Button
                      variant={exportFormat === "mp3" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setExportFormat("mp3")}
                      disabled={isExporting}
                      className="h-7 px-3 text-xs font-semibold uppercase"
                    >
                      MP3
                    </Button>
                    <Button
                      variant={exportFormat === "wav" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setExportFormat("wav")}
                      disabled={isExporting}
                      className="h-7 px-3 text-xs font-semibold uppercase"
                    >
                      WAV
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleDownload}
                  disabled={!processedResult || isProcessing || isExporting}
                  className="w-full py-6 text-base font-semibold shadow-md transition-all active:scale-[0.99]"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      Download
                    </>
                  )}
                </Button>
              </div>

              {isProcessing && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  Recalculating audio chunks in real-time...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Рекламный баннер */}
      <AdBanner slotId="waveform-bottom-slot" format="horizontal" />
    </main>
  );
}
