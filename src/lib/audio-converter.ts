import { Mp3Encoder } from "@breezystack/lamejs";

export type OutputFormat = "mp3" | "wav";
export type BitrateOption = 128 | 192 | 256 | 320;
export type SampleRateOption = 0 | 44100 | 48000 | 96000 | "original";
export type ChannelMode = "stereo" | "mono" | "original";
export type BitDepthOption = 16 | 24;

export interface ConversionOptions {
  format: OutputFormat;
  bitrate?: BitrateOption;
  bitDepth?: BitDepthOption;
  sampleRate?: SampleRateOption | number;
  channels?: ChannelMode;
}

export class AudioConverterEngine {
  /**
   * 1. Декодирование локального файла или Blob в AudioBuffer
   */
  public static async decodeAudio(blobOrFile: Blob): Promise<AudioBuffer> {
    const arrayBuffer = await blobOrFile.arrayBuffer();
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();

    try {
      const copy = arrayBuffer.slice(0);
      const audioBuffer = await ctx.decodeAudioData(copy);
      return audioBuffer;
    } finally {
      ctx.close().catch(() => {});
    }
  }

  /**
   * 2. Ресемплинг и преобразование каналов (Stereo / Mono / Sample Rate)
   */
  public static async resampleAndRemix(
    buffer: AudioBuffer,
    targetSampleRate?: number | SampleRateOption,
    targetChannels?: ChannelMode
  ): Promise<AudioBuffer> {
    const numericRate =
      typeof targetSampleRate === "number" && targetSampleRate > 0
        ? targetSampleRate
        : undefined;

    const finalSampleRate =
      numericRate && numericRate !== buffer.sampleRate
        ? numericRate
        : buffer.sampleRate;

    let finalChannelCount = buffer.numberOfChannels;
    if (targetChannels === "mono") finalChannelCount = 1;
    else if (targetChannels === "stereo") finalChannelCount = 2;

    if (
      finalSampleRate === buffer.sampleRate &&
      finalChannelCount === buffer.numberOfChannels
    ) {
      return buffer;
    }

    const length = Math.round((buffer.length * finalSampleRate) / buffer.sampleRate);
    const offlineCtx = new OfflineAudioContext(
      finalChannelCount,
      length,
      finalSampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    return await offlineCtx.startRendering();
  }

  /**
   * 3. Кодирование AudioBuffer в WAV (16-bit или 24-bit PCM)
   */
  public static async encodeWav(
    buffer: AudioBuffer,
    bitDepth: BitDepthOption = 24,
    onProgress?: (pct: number) => void
  ): Promise<Blob> {
    onProgress?.(10);
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataByteLength = length * blockAlign;
    const bufferByteLength = 44 + dataByteLength;

    const arrayBuffer = new ArrayBuffer(bufferByteLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataByteLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataByteLength, true);

    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(buffer.getChannelData(ch));
    }

    let offset = 44;

    if (bitDepth === 16) {
      for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
          const sample = Math.max(-1, Math.min(1, channels[ch][i]));
          const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
      }
    } else {
      for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
          const sample = Math.max(-1, Math.min(1, channels[ch][i]));
          const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
          const int24 = Math.floor(intSample);

          view.setUint8(offset, int24 & 0xff);
          view.setUint8(offset + 1, (int24 >> 8) & 0xff);
          view.setUint8(offset + 2, (int24 >> 16) & 0xff);
          offset += 3;
        }
      }
    }

    onProgress?.(100);
    return new Blob([arrayBuffer], { type: "audio/wav" });
  }

  /**
   * 4. Кодирование AudioBuffer в MP3
   */
  public static async encodeMp3(
    buffer: AudioBuffer,
    bitrate: BitrateOption = 320,
    onProgress?: (pct: number) => void
  ): Promise<Blob> {
    onProgress?.(10);
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;

    const leftFloat = buffer.getChannelData(0);
    const rightFloat = numChannels > 1 ? buffer.getChannelData(1) : leftFloat;

    const leftInt16 = new Int16Array(length);
    const rightInt16 = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      const sLeft = Math.max(-1, Math.min(1, leftFloat[i]));
      leftInt16[i] = sLeft < 0 ? sLeft * 0x8000 : sLeft * 0x7fff;

      const sRight = Math.max(-1, Math.min(1, rightFloat[i]));
      rightInt16[i] = sRight < 0 ? sRight * 0x8000 : sRight * 0x7fff;
    }

    const mp3Encoder = new Mp3Encoder(numChannels, sampleRate, bitrate);
    const mp3Data: Uint8Array[] = [];
    const sampleBlockSize = 1152;

    for (let i = 0; i < length; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      let mp3buf: Uint8Array;

      if (numChannels === 1) {
        mp3buf = mp3Encoder.encodeBuffer(leftChunk);
      } else {
        const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
        mp3buf = mp3Encoder.encodeBuffer(leftChunk, rightChunk);
      }

      if (mp3buf && mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }

      if (onProgress && length > 0) {
        onProgress(Math.min(95, Math.round(10 + (i / length) * 85)));
      }
    }

    const endBuf = mp3Encoder.flush();
    if (endBuf && endBuf.length > 0) {
      mp3Data.push(new Uint8Array(endBuf));
    }

    onProgress?.(100);
    return new Blob(mp3Data as BlobPart[], { type: "audio/mp3" });
  }

  /**
   * 5. Универсальный метод конвертации
   */
  public static async convert(
    sourceBuffer: AudioBuffer,
    options: ConversionOptions,
    onProgress?: (pct: number) => void
  ): Promise<Blob> {
    onProgress?.(10);

    const targetRate =
      typeof options.sampleRate === "number" && options.sampleRate > 0
        ? options.sampleRate
        : undefined;

    const processedBuffer = await this.resampleAndRemix(
      sourceBuffer,
      targetRate,
      options.channels
    );

    onProgress?.(30);

    if (options.format === "wav") {
      return this.encodeWav(processedBuffer, options.bitDepth || 24, (p) => {
        onProgress?.(30 + Math.round(p * 0.7));
      });
    }

    return this.encodeMp3(processedBuffer, options.bitrate || 320, (p) => {
      onProgress?.(30 + Math.round(p * 0.7));
    });
  }
}