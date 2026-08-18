import { SoundTouch, SimpleFilter, WebAudioBufferSource } from "soundtouchjs";
import { encodeWAV } from "./wav-encoder";
import { encodeMP3 } from "./mp3-encoder";

export type AudioExportFormat = "wav" | "mp3";

export class SoundTouchEngine {
  private audioCtx: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private soundTouch: SoundTouch | null = null;
  private filter: SimpleFilter | null = null;
  private source: WebAudioBufferSource | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private gainNode: GainNode | null = null;

  private isPlaying = false;
  private currentPitch = 0;
  private currentSpeed = 1.0;
  private currentVolume = 0.8;
  private currentPositionSeconds = 0;

  private onProgressCallback?: (time: number) => void;
  private onEndCallback?: () => void;

  public async loadAudio(
    file: File,
    onProgress: (time: number) => void,
    onEnd: () => void
  ): Promise<number> {
    this.destroy();

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    this.onProgressCallback = onProgress;
    this.onEndCallback = onEnd;

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);

    this.initPipeline();
    return this.audioBuffer.duration;
  }

  private initPipeline() {
    if (!this.audioCtx || !this.audioBuffer) return;

    this.soundTouch = new SoundTouch(this.audioCtx.sampleRate);
    this.setPitch(this.currentPitch);
    this.setSpeed(this.currentSpeed);

    this.source = new WebAudioBufferSource(this.audioBuffer);
    this.source.position = Math.floor(
      this.currentPositionSeconds * this.audioBuffer.sampleRate
    );

    this.filter = new SimpleFilter(this.source, this.soundTouch);

    this.scriptNode = this.audioCtx.createScriptProcessor(4096, 2, 2);
    this.gainNode = this.audioCtx.createGain();
    this.setVolume(this.currentVolume);

    const samples = new Float32Array(4096 * 2);

    this.scriptNode.onaudioprocess = (e) => {
      if (!this.filter || !this.source || !this.audioBuffer) return;

      const left = e.outputBuffer.getChannelData(0);
      const right = e.outputBuffer.getChannelData(1);

      const framesExtracted = this.filter.extract(samples, 4096);

      if (framesExtracted === 0) {
        left.fill(0);
        right.fill(0);
        if (this.isPlaying) {
          this.pause();
          this.seek(0);
          this.onEndCallback?.();
        }
        return;
      }

      for (let i = 0; i < framesExtracted; i++) {
        left[i] = samples[i * 2];
        right[i] = samples[i * 2 + 1];
      }

      for (let i = framesExtracted; i < 4096; i++) {
        left[i] = 0;
        right[i] = 0;
      }

      this.currentPositionSeconds =
        this.source.position / this.audioBuffer.sampleRate;
      this.onProgressCallback?.(this.currentPositionSeconds);
    };
  }

  public async play() {
    if (!this.audioCtx || !this.scriptNode || !this.gainNode) return;

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    this.scriptNode.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
    this.isPlaying = true;
  }

  public pause() {
    if (!this.scriptNode || !this.gainNode) return;
    try {
      this.scriptNode.disconnect();
      this.gainNode.disconnect();
    } catch {}
    this.isPlaying = false;
  }

  public seek(seconds: number) {
    if (!this.audioBuffer || !this.source || !this.filter) return;

    const wasPlaying = this.isPlaying;
    if (wasPlaying) this.pause();

    const safeSec = Math.max(0, Math.min(seconds, this.audioBuffer.duration));
    this.currentPositionSeconds = safeSec;
    this.source.position = Math.floor(safeSec * this.audioBuffer.sampleRate);
    this.filter.clear();

    this.onProgressCallback?.(safeSec);

    if (wasPlaying) {
      this.play();
    }
  }

  public setPitch(semitones: number) {
    this.currentPitch = semitones;
    if (this.soundTouch) {
      this.soundTouch.pitch = Math.pow(2, semitones / 12);
    }
  }

  public setSpeed(speed: number) {
    this.currentSpeed = speed;
    if (this.soundTouch) {
      this.soundTouch.tempo = speed;
    }
  }

  public setVolume(volume: number) {
    this.currentVolume = volume;
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    }
  }

  public async renderOffline(
    semitones: number,
    speed: number,
    format: AudioExportFormat,
    onProgress: (pct: number) => void
  ): Promise<Blob | null> {
    if (!this.audioBuffer) return null;

    const sampleRate = this.audioBuffer.sampleRate;
    const st = new SoundTouch(sampleRate);
    st.pitch = Math.pow(2, semitones / 12);
    st.tempo = speed;

    const src = new WebAudioBufferSource(this.audioBuffer);
    const filter = new SimpleFilter(src, st);

    const chunkSize = 16384;
    const samples = new Float32Array(chunkSize * 2);
    const leftChunks: Float32Array[] = [];
    const rightChunks: Float32Array[] = [];

    let totalFrames = 0;
    const totalSourceFrames = this.audioBuffer.length;

    while (true) {
      const framesExtracted = filter.extract(samples, chunkSize);
      if (framesExtracted === 0) break;

      const left = new Float32Array(framesExtracted);
      const right = new Float32Array(framesExtracted);

      for (let i = 0; i < framesExtracted; i++) {
        left[i] = samples[i * 2];
        right[i] = samples[i * 2 + 1];
      }

      leftChunks.push(left);
      rightChunks.push(right);
      totalFrames += framesExtracted;

      const pct = Math.min(
        90,
        Math.round((src.position / totalSourceFrames) * 90)
      );
      onProgress(pct);

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const finalLeft = new Float32Array(totalFrames);
    const finalRight = new Float32Array(totalFrames);
    let offset = 0;

    for (let i = 0; i < leftChunks.length; i++) {
      finalLeft.set(leftChunks[i], offset);
      finalRight.set(rightChunks[i], offset);
      offset += leftChunks[i].length;
    }

    onProgress(95);

    if (format === "mp3") {
      const blob = encodeMP3(finalLeft, finalRight, sampleRate, 256);
      onProgress(100);
      return blob;
    } else {
      const blob = encodeWAV(finalLeft, finalRight, sampleRate);
      onProgress(100);
      return blob;
    }
  }

  public destroy() {
    this.pause();
    if (this.scriptNode) {
      this.scriptNode.onaudioprocess = null;
      this.scriptNode = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.filter = null;
    this.source = null;
    this.soundTouch = null;
    this.audioBuffer = null;
    this.isPlaying = false;
    this.currentPositionSeconds = 0;
  }
}