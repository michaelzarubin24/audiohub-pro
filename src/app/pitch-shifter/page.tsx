"use client";

import { useState, useEffect, useRef } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileDropzone } from "@/components/shared/file-dropzone";
import { PlayerControls } from "@/components/audio/player-controls";
import { PitchControls } from "@/components/audio/pitch-controls";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SoundTouchEngine, AudioExportFormat } from "@/lib/soundtouch-engine";

export default function PitchShifterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [pitch, setPitch] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isReady, setIsReady] = useState(false);

  // Формат и экспорт
  const [exportFormat, setExportFormat] = useState<AudioExportFormat>("mp3");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const engineRef = useRef<SoundTouchEngine | null>(null);

  useEffect(() => {
    const engine = new SoundTouchEngine();
    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, []);

  useEffect(() => {
    if (!file || !engineRef.current) {
      if (engineRef.current) engineRef.current.destroy();
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      setPitch(0);
      setSpeed(1);
      setIsReady(false);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      try {
        setIsReady(false);
        const dur = await engineRef.current!.loadAudio(
          file,
          (pos) => setCurrentTime(pos),
          () => {
            setIsPlaying(false);
            setCurrentTime(0);
          },
        );

        if (isCancelled) return;

        setDuration(dur);
        setCurrentTime(0);
        setIsReady(true);
      } catch (err) {
        console.error("Audio engine failed to load file:", err);
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, [file]);

  const togglePlay = async () => {
    if (!engineRef.current || !isReady) return;

    if (isPlaying) {
      engineRef.current.pause();
      setIsPlaying(false);
    } else {
      await engineRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (newTime: number) => {
    if (!engineRef.current || !isReady) return;
    engineRef.current.seek(newTime);
    setCurrentTime(newTime);
  };

  const handleReset = () => {
    if (!engineRef.current || !isReady) return;
    engineRef.current.seek(0);
    setCurrentTime(0);
  };

  const handlePitchChange = (newPitch: number) => {
    setPitch(newPitch);
    if (engineRef.current) {
      engineRef.current.setPitch(newPitch);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (engineRef.current) {
      engineRef.current.setSpeed(newSpeed);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (engineRef.current) {
      engineRef.current.setVolume(newVol);
    }
  };

  const handleDownload = async () => {
    if (!engineRef.current || !file || !isReady || isExporting) return;

    try {
      setIsExporting(true);
      setExportProgress(0);

      if (isPlaying) {
        engineRef.current.pause();
        setIsPlaying(false);
      }

      const audioBlob = await engineRef.current.renderOffline(
        pitch,
        speed,
        exportFormat,
        (pct: number) => setExportProgress(pct),
      );

      if (!audioBlob) throw new Error("Failed to generate audio file.");

      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const pitchSuffix =
        pitch !== 0 ? `_${pitch > 0 ? "+" : ""}${pitch}st` : "";
      const speedSuffix = speed !== 1 ? `_${speed}x` : "";
      const outputFilename = `${baseName}_shifted${pitchSuffix}${speedSuffix}.${exportFormat}`;

      const downloadUrl = URL.createObjectURL(audioBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = outputFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Audio Pitch & Speed Shifter
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Studio-quality pitch transposition and time-stretching right in your
          browser.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">Audio Track</CardTitle>
          <CardDescription>
            High-fidelity WSOLA processing — 100% private and client-side.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FileDropzone selectedFile={file} onFileSelect={setFile} />

          {file && (
            <div className="space-y-6">
              <PitchControls
                pitch={pitch}
                speed={speed}
                onPitchChange={handlePitchChange}
                onSpeedChange={handleSpeedChange}
                onResetPitch={() => handlePitchChange(0)}
                onResetSpeed={() => handleSpeedChange(1)}
                disabled={!isReady || isExporting}
              />

              <PlayerControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                onPlayToggle={togglePlay}
                onSeek={handleSeek}
                onReset={handleReset}
                onVolumeChange={handleVolumeChange}
                disabled={!isReady || isExporting}
              />

              {/* Блок формата и скачивания */}
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

                {isExporting ? (
                  <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rendering {exportFormat.toUpperCase()} ({exportProgress}
                      %)...
                    </div>
                    <Progress value={exportProgress} className="h-2" />
                  </div>
                ) : (
                  <Button
                    onClick={handleDownload}
                    disabled={!isReady || isExporting}
                    className="w-full py-6 text-base font-semibold shadow-md transition-all active:scale-[0.99]"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    Download
                  </Button>
                )}
              </div>

              {!isReady && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  Decoding and preparing WSOLA sound engine...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
