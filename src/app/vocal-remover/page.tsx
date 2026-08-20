"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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
  VolumeX,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

// Кодирование AudioBuffer в стандартный 16-bit PCM WAV
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;

  let interleaved: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    let idx = 0;
    for (let i = 0; i < left.length; i++) {
      interleaved[idx++] = left[i];
      interleaved[idx++] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + interleaved.length * bytesPerSample);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + interleaved.length * bytesPerSample, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, interleaved.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return arrayBuffer;
}

function formatDuration(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function VocalRemoverPage() {
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(
    null,
  );
  const [fileName, setFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Сгенерированные стэмы
  const [instrumentalBuffer, setInstrumentalBuffer] =
    useState<AudioBuffer | null>(null);
  const [vocalBuffer, setVocalBuffer] = useState<AudioBuffer | null>(null);

  // Воспроизведение и микширование
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [vocalVolume, setVocalVolume] = useState(0); // 0 = Полный минус (Караоке)
  const [musicVolume, setMusicVolume] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);

  // Web Audio Context & Nodes
  const audioCtxRef = useRef<AudioContext | null>(null);
  const vocalSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const musicSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const vocalGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef(0);
  const pauseOffsetRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const stopPlayback = useCallback(() => {
    if (vocalSourceRef.current) {
      try {
        vocalSourceRef.current.stop();
        vocalSourceRef.current.disconnect();
      } catch {}
      vocalSourceRef.current = null;
    }
    if (musicSourceRef.current) {
      try {
        musicSourceRef.current.stop();
        musicSourceRef.current.disconnect();
      } catch {}
      musicSourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Алгоритм фазового Mid/Side разделения с защитой саб-баса
  const processStemSeparation = async (srcBuffer: AudioBuffer) => {
    setIsProcessing(true);
    setProcessProgress(20);

    try {
      const ctx = getAudioContext();
      const length = srcBuffer.length;
      const sampleRate = srcBuffer.sampleRate;

      const instBuf = ctx.createBuffer(2, length, sampleRate);
      const vocBuf = ctx.createBuffer(2, length, sampleRate);

      const left = srcBuffer.getChannelData(0);
      const right =
        srcBuffer.numberOfChannels > 1 ? srcBuffer.getChannelData(1) : left;

      const instL = instBuf.getChannelData(0);
      const instR = instBuf.getChannelData(1);
      const vocL = vocBuf.getChannelData(0);
      const vocR = vocBuf.getChannelData(1);

      setProcessProgress(45);

      // DSP-фильтрация: срез баса (~180Hz) для сохранения кика и басовой линии в минусовке
      let bassFilterL = 0;
      let bassFilterR = 0;
      const alpha = 0.08;

      for (let i = 0; i < length; i++) {
        const l = left[i];
        const r = right[i];

        // Выделение низкочастотной составляющей
        bassFilterL += alpha * (l - bassFilterL);
        bassFilterR += alpha * (r - bassFilterR);

        // Инструментал: Side (боковые частоты без моно-вокала) + сохраненный бас
        const sideL = (l - r) * 0.75;
        const sideR = (r - l) * 0.75;

        instL[i] = Math.max(-1, Math.min(1, sideL + bassFilterL * 0.85));
        instR[i] = Math.max(-1, Math.min(1, sideR + bassFilterR * 0.85));

        // Вокал: центральный канал (Mid) за вычетом низких частот
        const center = (l + r) * 0.5 - (bassFilterL + bassFilterR) * 0.45;
        vocL[i] = Math.max(-1, Math.min(1, center));
        vocR[i] = Math.max(-1, Math.min(1, center));
      }

      setProcessProgress(85);
      setInstrumentalBuffer(instBuf);
      setVocalBuffer(vocBuf);
      setProcessProgress(100);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to separate audio: " + err.message);
    } finally {
      setTimeout(() => setIsProcessing(false), 300);
    }
  };

  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    stopPlayback();
    pauseOffsetRef.current = 0;
    setCurrentTime(0);

    try {
      const ctx = getAudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer);

      if (decoded.numberOfChannels < 2) {
        setErrorMessage(
          "Notice: This is a mono track. Stereo tracks give optimal vocal separation results.",
        );
      }

      setOriginalBuffer(decoded);
      setFileName(file.name);
      await processStemSeparation(decoded);
    } catch {
      setErrorMessage(
        "Could not decode this audio file. Please ensure it is a valid MP3, WAV, FLAC, or AAC.",
      );
    }
  };

  const togglePlay = () => {
    if (!instrumentalBuffer || !vocalBuffer || !originalBuffer) return;
    const ctx = getAudioContext();

    if (isPlaying) {
      pauseOffsetRef.current += ctx.currentTime - startTimeRef.current;
      stopPlayback();
    } else {
      if (pauseOffsetRef.current >= originalBuffer.duration) {
        pauseOffsetRef.current = 0;
      }

      const instSrc = ctx.createBufferSource();
      const vocSrc = ctx.createBufferSource();
      instSrc.buffer = instrumentalBuffer;
      vocSrc.buffer = vocalBuffer;

      const instGain = ctx.createGain();
      const vocGain = ctx.createGain();
      instGain.gain.value = musicVolume;
      vocGain.gain.value = vocalVolume;

      instSrc.connect(instGain).connect(ctx.destination);
      vocSrc.connect(vocGain).connect(ctx.destination);

      musicGainRef.current = instGain;
      vocalGainRef.current = vocGain;

      instSrc.start(0, pauseOffsetRef.current);
      vocSrc.start(0, pauseOffsetRef.current);

      startTimeRef.current = ctx.currentTime;
      musicSourceRef.current = instSrc;
      vocalSourceRef.current = vocSrc;
      setIsPlaying(true);

      const updateLoop = () => {
        const elapsed =
          pauseOffsetRef.current + (ctx.currentTime - startTimeRef.current);
        if (elapsed >= originalBuffer.duration) {
          pauseOffsetRef.current = 0;
          setCurrentTime(0);
          stopPlayback();
        } else {
          setCurrentTime(elapsed);
          animFrameRef.current = requestAnimationFrame(updateLoop);
        }
      };
      animFrameRef.current = requestAnimationFrame(updateLoop);

      instSrc.onended = () => {
        if (
          pauseOffsetRef.current + (ctx.currentTime - startTimeRef.current) >=
          originalBuffer.duration
        ) {
          pauseOffsetRef.current = 0;
          setCurrentTime(0);
          setIsPlaying(false);
        }
      };
    }
  };

  const handleSeek = (val: number | readonly number[]) => {
    if (!originalBuffer) return;
    const newPos = Array.isArray(val) ? val[0] : (val as number);
    const wasPlaying = isPlaying;
    stopPlayback();
    pauseOffsetRef.current = newPos;
    setCurrentTime(newPos);
    if (wasPlaying) togglePlay();
  };

  const handleVocalVolChange = (val: number | readonly number[]) => {
    const v = Array.isArray(val) ? val[0] : (val as number);
    setVocalVolume(v);
    if (vocalGainRef.current) vocalGainRef.current.gain.value = v;
  };

  const handleMusicVolChange = (val: number | readonly number[]) => {
    const v = Array.isArray(val) ? val[0] : (val as number);
    setMusicVolume(v);
    if (musicGainRef.current) musicGainRef.current.gain.value = v;
  };

  // Экспорт стэма в WAV файл
  const downloadStem = (type: "instrumental" | "vocals") => {
    const buf = type === "instrumental" ? instrumentalBuffer : vocalBuffer;
    if (!buf) return;

    const wavBytes = audioBufferToWav(buf);
    const blob = new Blob([wavBytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = fileName.replace(/\.[^/.]+$/, "") || "song";
    a.href = url;
    a.download = `${base}_${type === "instrumental" ? "instrumental_minus" : "vocals_acapella"}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
    };
  }, [stopPlayback]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8">
      {/* Заголовок */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Client-Side DSP Engine • 100% Free & Private</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Vocal Remover & Karaoke Maker
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Extract instrumental backing tracks (минусовка) or isolate center
          acapella vocals in real time directly in your browser.
        </p>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm">
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
              <Upload className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              Select or Drop Song File
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Supports MP3, WAV, FLAC, AAC, OGG (Processed instantly in memory)
            </p>
          </div>

          {isProcessing && (
            <div className="space-y-2 pt-5 animate-in fade-in">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">
                  Isolating Vocal & Instrumental Stems...
                </span>
                <span className="font-mono text-primary">
                  {processProgress}%
                </span>
              </div>
              <Progress value={processProgress} className="h-2 rounded-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Микшер стэмов и плеер */}
      {originalBuffer && !isProcessing && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="border-border/60 bg-card/60 backdrop-blur-xl shadow-sm">
            <CardContent className="p-5 sm:p-6 space-y-6">
              {/* Шапка трека */}
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
                      <span>
                        {formatDuration(originalBuffer.duration)} • Real-time
                        Stems Ready
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSeek(0)}
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                    title="Rewind to start"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>

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
              </div>

              {/* Таймлайн */}
              <div className="space-y-2">
                <Slider
                  value={[currentTime]}
                  max={originalBuffer.duration}
                  step={0.05}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(originalBuffer.duration)}</span>
                </div>
              </div>

              {/* Независимые фейдеры громкости */}
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
                    onValueChange={handleMusicVolChange}
                    className="cursor-pointer"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleMusicVolChange(musicVolume === 0 ? 1 : 0)
                    }
                    className="h-7 text-[11px] rounded-lg w-full flex items-center justify-center gap-1.5"
                  >
                    {musicVolume === 0 ? (
                      <Volume2 className="h-3.5 w-3.5" />
                    ) : (
                      <VolumeX className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {musicVolume === 0 ? "Unmute Music" : "Mute Music"}
                    </span>
                  </Button>
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
                    onValueChange={handleVocalVolChange}
                    className="cursor-pointer"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleVocalVolChange(vocalVolume === 0 ? 1 : 0)
                    }
                    className="h-7 text-[11px] rounded-lg w-full flex items-center justify-center gap-1.5"
                  >
                    {vocalVolume === 0 ? (
                      <Volume2 className="h-3.5 w-3.5" />
                    ) : (
                      <VolumeX className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {vocalVolume === 0
                        ? "Unmute Vocals"
                        : "Karaoke Mode (Mute Vocals)"}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Кнопки скачивания */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  onClick={() => downloadStem("instrumental")}
                  className="h-11 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Instrumental (Минусовка)</span>
                </Button>

                <Button
                  onClick={() => downloadStem("vocals")}
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
