"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Play, Pause, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { WaveformControls } from "@/components/audio/waveform-controls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  WaveformGeneratorEngine,
  WaveformConfig,
} from "@/lib/waveform-generator";
import { formatTime } from "@/lib/audio-utils";

export type StaticExportFormat = "png" | "svg" | "json";

const DEFAULT_CONFIG: WaveformConfig = {
  style: "mirrored",
  barCount: 96,
  barGap: 0.3,
  barRadius: 4,
  colorStart: "#8B5CF6",
  colorEnd: "#EC4899",
  backgroundColor: "#09090b",
  width: 1080,
  height: 1920,
  aspectRatio: "9:16",
  trackTitle: "",
  showTitle: true,
  unplayedOpacity: 0.25,
  isReactive: true,
};

export default function WaveformGeneratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [config, setConfig] = useState<WaveformConfig>(DEFAULT_CONFIG);
  const [mode, setMode] = useState<"video" | "static">("video");
  const [staticFormat, setStaticFormat] = useState<StaticExportFormat>("png");

  // Воспроизведение
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Экспорт видео
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqDataRef = useRef<Uint8Array | null>(null);

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

      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      analyserRef.current = analyser;
      freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
    }
    return audioCtxRef.current;
  };

  // 1. Декодирование файла
  useEffect(() => {
    if (!file) {
      stopAudio();
      audioBufferRef.current = null;
      setPeaks(null);
      setDuration(0);
      setCurrentTime(0);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      try {
        stopAudio();
        const ctx = getAudioContext();
        const arrayBuf = await file.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);

        if (isCancelled) return;

        audioBufferRef.current = audioBuf;
        setDuration(audioBuf.duration);
        setCurrentTime(0);
        startOffsetRef.current = 0;

        const trackName = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        setConfig((prev) => ({ ...prev, trackTitle: trackName }));

        const p = WaveformGeneratorEngine.extractPeaks(
          audioBuf,
          config.barCount,
        );
        setPeaks(p);
      } catch (err) {
        console.error("Failed to decode audio for waveform:", err);
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  // 2. Пересчет пиков
  useEffect(() => {
    if (!audioBufferRef.current) return;
    const p = WaveformGeneratorEngine.extractPeaks(
      audioBufferRef.current,
      config.barCount,
    );
    setPeaks(p);
  }, [config.barCount]);

  // 3. Отрисовка
  const redraw = (timeSec: number, liveFrequencies?: Uint8Array | null) => {
    if (!canvasRef.current || !peaks) return;
    const progress = duration > 0 ? timeSec / duration : 0;
    WaveformGeneratorEngine.renderCanvas(
      canvasRef.current,
      peaks,
      config,
      mode === "video" ? progress : 0,
      liveFrequencies,
    );
  };

  useEffect(() => {
    if (!isPlaying) {
      redraw(currentTime, null);
    }
  }, [peaks, config, mode, currentTime, duration, isPlaying]);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

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

  // Живой цикл сбора частот
  const updateLoop = () => {
    if (!audioCtxRef.current || !duration) return;

    const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
    const currentPos = startOffsetRef.current + elapsed;

    if (currentPos >= duration) {
      stopAudio();
      setCurrentTime(0);
      startOffsetRef.current = 0;
      redraw(0, null);
      return;
    }

    setCurrentTime(currentPos);

    if (analyserRef.current && freqDataRef.current && config.isReactive) {
      analyserRef.current.getByteFrequencyData(freqDataRef.current as any);
      redraw(currentPos, freqDataRef.current);
    } else {
      redraw(currentPos, null);
    }

    animFrameRef.current = requestAnimationFrame(updateLoop);
  };

  const togglePlay = async () => {
    if (!audioBufferRef.current || isExportingVideo) return;
    const ctx = getAudioContext();

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    if (isPlaying) {
      stopAudio();
      startOffsetRef.current = currentTime;
      redraw(currentTime, null);
    } else {
      stopAudio();

      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;

      if (analyserRef.current) {
        source.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }

      sourceNodeRef.current = source;
      startTimeRef.current = ctx.currentTime;
      source.start(0, currentTime);
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(updateLoop);
    }
  };

  const handleSeek = (timeSec: number) => {
    if (!audioBufferRef.current || isExportingVideo) return;
    const wasPlaying = isPlaying;
    stopAudio();

    const safe = Math.max(0, Math.min(timeSec, duration));
    setCurrentTime(safe);
    startOffsetRef.current = safe;
    redraw(safe, null);

    if (wasPlaying) {
      const ctx = getAudioContext();
      const source = ctx.createBufferSource();
      source.buffer = audioBufferRef.current;

      if (analyserRef.current) {
        source.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }

      sourceNodeRef.current = source;
      startTimeRef.current = ctx.currentTime;
      source.start(0, safe);
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(updateLoop);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || duration === 0 || isExportingVideo) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    handleSeek(ratio * duration);
  };

  const handleDownload = async () => {
    if (!peaks || !file || !audioBufferRef.current) return;
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    if (mode === "video") {
      try {
        stopAudio();
        setIsExportingVideo(true);
        setExportProgress(0);

        const videoBlob = await WaveformGeneratorEngine.recordVideo(
          audioBufferRef.current,
          peaks,
          config,
          (pct) => setExportProgress(pct),
        );

        const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
        const downloadUrl = URL.createObjectURL(videoBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${baseName}_visualizer.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      } catch (err) {
        console.error("Video export failed:", err);
      } finally {
        setIsExportingVideo(false);
        setExportProgress(0);
      }
    } else {
      if (staticFormat === "png") {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `${baseName}_waveform.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (staticFormat === "svg") {
        const svgCode = WaveformGeneratorEngine.generateSVG(peaks, config);
        const blob = new Blob([svgCode], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseName}_waveform.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (staticFormat === "json") {
        const jsonStr = JSON.stringify(
          {
            filename: file.name,
            duration,
            sampleRate: audioBufferRef.current.sampleRate,
            peaks,
          },
          null,
          2,
        );
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseName}_waveform.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Audio Waveform Visualizer
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Create beat-reactive animated video visualizers for Reels & Shorts or
          export clean static PNG/SVG graphics.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Audio Track</CardTitle>
          <CardDescription>
            Beat-reactive video recording & vector export — 100% private.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileDropzone selectedFile={file} onFileSelect={setFile} />

          {file && (
            <div className="space-y-6">
              {/* Превью */}
              <div className="relative overflow-hidden rounded-xl border border-border/80 bg-zinc-950 p-4 shadow-inner">
                <div className="flex items-center justify-between text-xs text-muted-foreground pb-2">
                  <span className="flex items-center gap-1 font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    {mode === "video"
                      ? "Beat-Reactive Video Preview"
                      : "Static Artwork Preview"}
                  </span>
                  <span className="font-mono">
                    {config.width} × {config.height} px ({config.aspectRatio})
                  </span>
                </div>

                <div
                  className={`flex items-center justify-center overflow-hidden rounded-lg bg-zinc-900/60 transition-all ${
                    config.aspectRatio === "9:16" ? "h-80" : "h-56"
                  }`}
                >
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="max-h-full max-w-full object-contain cursor-pointer rounded"
                    title="Click to seek"
                  />
                </div>

                {/* Плеер предпрослушивания */}
                {mode === "video" && (
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40 mt-3">
                    <Button
                      size="sm"
                      onClick={togglePlay}
                      disabled={isExportingVideo}
                      className="h-8 px-3 rounded-full gap-1.5 text-xs font-semibold"
                    >
                      {isPlaying ? (
                        <Pause className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      {isPlaying ? "Pause" : "Play Beat Preview"}
                    </Button>
                    <div className="text-xs font-mono text-muted-foreground">
                      <span>{formatTime(currentTime)}</span> /{" "}
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                )}
              </div>

              <WaveformControls
                mode={mode}
                onModeChange={setMode}
                config={config}
                onChange={setConfig}
                disabled={isExportingVideo}
              />

              <div className="space-y-3 pt-2">
                {mode === "static" && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Static Format:
                    </span>
                    <div className="flex items-center rounded-lg border border-border/80 bg-secondary/30 p-1">
                      <Button
                        variant={staticFormat === "png" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setStaticFormat("png")}
                        className="h-7 px-3 text-xs font-semibold uppercase"
                      >
                        PNG (Image)
                      </Button>
                      <Button
                        variant={staticFormat === "svg" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setStaticFormat("svg")}
                        className="h-7 px-3 text-xs font-semibold uppercase"
                      >
                        SVG (Vector)
                      </Button>
                      <Button
                        variant={staticFormat === "json" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setStaticFormat("json")}
                        className="h-7 px-3 text-xs font-semibold uppercase"
                      >
                        JSON (Data)
                      </Button>
                    </div>
                  </div>
                )}

                {isExportingVideo ? (
                  <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recording & Rendering Video ({exportProgress}%)...
                    </div>
                    <Progress value={exportProgress} className="h-2" />
                  </div>
                ) : (
                  <Button
                    onClick={handleDownload}
                    disabled={!peaks || isExportingVideo}
                    className="w-full py-6 text-base font-semibold shadow-md transition-all active:scale-[0.99]"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    {mode === "video" ? "Export & Download Video" : "Download"}
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
