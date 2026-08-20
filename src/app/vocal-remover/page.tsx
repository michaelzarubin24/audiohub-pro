"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sparkles,
  FileAudio,
  AlertCircle,
  Loader2,
  Mic,
  Music2,
  Volume2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

function formatDuration(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function VocalRemoverPage() {
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ссылки на готовые аудиодорожки
  const [vocalsUrl, setVocalsUrl] = useState<string | null>(null);
  const [instrumentalUrl, setInstrumentalUrl] = useState<string | null>(null);

  // Состояние синхронного плеера
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Громкость дорожек
  const [vocalVolume, setVocalVolume] = useState(0); // По умолчанию 0 (Караоке минус)
  const [musicVolume, setMusicVolume] = useState(1);

  // Ссылки на HTML5 Audio элементы
  const vocalsAudioRef = useRef<HTMLAudioElement | null>(null);
  const instrumentalAudioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Синхронизация громкости
  useEffect(() => {
    if (vocalsAudioRef.current) vocalsAudioRef.current.volume = vocalVolume;
  }, [vocalVolume]);

  useEffect(() => {
    if (instrumentalAudioRef.current)
      instrumentalAudioRef.current.volume = musicVolume;
  }, [musicVolume]);

  // Загрузка и отправка файла в нейросеть
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage(
        "File is too large. Please upload an audio file under 25MB.",
      );
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setFileName(file.name);
    setVocalsUrl(null);
    setInstrumentalUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/vocal-remover", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Neural network separation failed.");
      }

      setVocalsUrl(data.vocalsUrl);
      setInstrumentalUrl(data.instrumentalUrl);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process audio.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Управление воспроизведением
  const togglePlay = () => {
    const voc = vocalsAudioRef.current;
    const inst = instrumentalAudioRef.current;

    if (!inst && !voc) return;

    if (isPlaying) {
      voc?.pause();
      inst?.pause();
      setIsPlaying(false);
    } else {
      // Синхронизация времени перед стартом
      if (voc && inst) {
        voc.currentTime = inst.currentTime;
      }
      inst?.play();
      voc?.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number | readonly number[]) => {
    const newPos = Array.isArray(value) ? value[0] : (value as number);
    if (vocalsAudioRef.current) vocalsAudioRef.current.currentTime = newPos;
    if (instrumentalAudioRef.current)
      instrumentalAudioRef.current.currentTime = newPos;
    setCurrentTime(newPos);
  };

  const handleTimeUpdate = () => {
    if (instrumentalAudioRef.current) {
      setCurrentTime(instrumentalAudioRef.current.currentTime);
      if (!duration && instrumentalAudioRef.current.duration) {
        setDuration(instrumentalAudioRef.current.duration);
      }
    }
  };

  // Скачивание дорожки
  const downloadTrack = async (url: string, type: "minus" | "acapella") => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const base = fileName.replace(/\.[^/.]+$/, "") || "song";
      a.href = blobUrl;
      a.download = `${base}_${type === "minus" ? "instrumental_minus" : "vocals_acapella"}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8">
      {/* Скрытые аудиоплееры для синхронизации */}
      {vocalsUrl && (
        <audio
          ref={vocalsAudioRef}
          src={vocalsUrl}
          preload="auto"
          onEnded={() => setIsPlaying(false)}
        />
      )}
      {instrumentalUrl && (
        <audio
          ref={instrumentalAudioRef}
          src={instrumentalUrl}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Заголовок */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Meta Demucs v4 AI Powered</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          AI Vocal Remover & Stems Isolator
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Split any full track into studio-quality instrumental backing track
          (минусовка) and clean acapella vocals.
        </p>
      </div>

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

      {/* Зона загрузки */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-border/70 rounded-2xl p-8 text-center transition-all ${
              isProcessing
                ? "opacity-60 cursor-not-allowed"
                : "hover:border-primary/50 hover:bg-secondary/30 cursor-pointer group"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              disabled={isProcessing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />

            <div className="mx-auto w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-transform mb-3 border border-border/40">
              {isProcessing ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </div>

            <div className="text-sm font-semibold text-foreground">
              {isProcessing
                ? "AI is separating audio stems..."
                : "Choose Song File or Drag & Drop"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Supports MP3, WAV, FLAC, AAC up to 25MB (Takes ~15–20 seconds)
            </p>
          </div>

          {isProcessing && (
            <div className="space-y-2 pt-6 animate-in fade-in">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                  Neural Network Demucs v4 processing stems...
                </span>
                <span className="font-mono text-primary animate-pulse">
                  Running AI
                </span>
              </div>
              <Progress value={null} className="h-2 rounded-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Результат и микшер дорожек */}
      {vocalsUrl && instrumentalUrl && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-sm">
            <CardContent className="p-5 sm:p-6 space-y-6">
              {/* Шапка плеера */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <FileAudio className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-foreground truncate">
                      {fileName}
                    </div>
                    <div className="text-xs text-emerald-500 flex items-center gap-1 mt-0.5 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>AI Separation Complete</span>
                    </div>
                  </div>
                </div>

                <Button
                  size="icon"
                  onClick={togglePlay}
                  className="h-11 w-11 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
              </div>

              {/* Таймлайн тайминга */}
              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Независимые фейдеры дорожек */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Фейдер Музыки */}
                <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Music2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-bold text-foreground">
                        Instrumental (Minus)
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {Math.round(musicVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[musicVolume]}
                    max={1}
                    step={0.01}
                    onValueChange={(val) =>
                      setMusicVolume(Array.isArray(val) ? val[0] : val)
                    }
                    className="cursor-pointer"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMusicVolume(musicVolume === 0 ? 1 : 0)}
                      className="h-7 text-[11px] rounded-lg w-full"
                    >
                      {musicVolume === 0 ? "Unmute" : "Mute Music"}
                    </Button>
                  </div>
                </div>

                {/* Фейдер Вокала */}
                <div className="p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs font-bold text-foreground">
                        Vocals (Acapella)
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {Math.round(vocalVolume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[vocalVolume]}
                    max={1}
                    step={0.01}
                    onValueChange={(val) =>
                      setVocalVolume(Array.isArray(val) ? val[0] : val)
                    }
                    className="cursor-pointer"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVocalVolume(vocalVolume === 0 ? 1 : 0)}
                      className="h-7 text-[11px] rounded-lg w-full"
                    >
                      {vocalVolume === 0
                        ? "Unmute Vocals"
                        : "Karaoke Mode (Mute Vocals)"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Кнопки прямого скачивания */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => downloadTrack(instrumentalUrl, "minus")}
                  className="h-11 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Instrumental (Минусовка)</span>
                </Button>

                <Button
                  onClick={() => downloadTrack(vocalsUrl, "acapella")}
                  variant="outline"
                  className="h-11 rounded-xl text-xs sm:text-sm font-bold border-border/70 hover:bg-secondary flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Vocals (Акапелла)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
