declare module "soundtouchjs" {
  export class SoundTouch {
    constructor(sampleRate?: number);
    rate: number;
    tempo: number;
    pitch: number;
    pitchSemitones: number;
    process(): void;
  }

  export class WebAudioBufferSource {
    constructor(buffer: AudioBuffer);
    buffer: AudioBuffer;
    position: number;
    extract(target: Float32Array, numFrames: number, position: number): number;
  }

  export class SimpleFilter {
    constructor(source: WebAudioBufferSource, soundTouch: SoundTouch);
    source: WebAudioBufferSource;
    soundTouch: SoundTouch;
    sourcePosition: number;
    clear(): void;
    extract(target: Float32Array, numFrames?: number): number;
  }
}