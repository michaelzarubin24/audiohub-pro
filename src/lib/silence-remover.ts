import { encodeWAV } from "./wav-encoder";
import { encodeMP3 } from "./mp3-encoder";

export interface SilenceOptions {
  thresholdDb: number; // e.g. -40 dB
  minSilenceMs: number; // e.g. 300 ms
  paddingMs: number; // e.g. 50 ms
}

export interface SilenceStats {
  originalDuration: number;
  processedDuration: number;
  removedDuration: number;
  percentageSaved: number;
  cutsCount: number;
}

export interface ProcessedAudioResult {
  audioBuffer: AudioBuffer;
  samplesL: Float32Array;
  samplesR: Float32Array;
  stats: SilenceStats;
}

export class SilenceRemoverEngine {
  /**
   * Анализирует аудиобуфер и возвращает новый сшитый буфер без тишины
   */
  public static process(
    audioBuffer: AudioBuffer,
    options: SilenceOptions,
    audioCtx: AudioContext
  ): ProcessedAudioResult {
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const totalFrames = audioBuffer.length;

    const leftIn = audioBuffer.getChannelData(0);
    const rightIn = numChannels > 1 ? audioBuffer.getChannelData(1) : leftIn;

    const thresholdLinear = Math.pow(10, options.thresholdDb / 20);
    const minSilenceFrames = Math.floor((options.minSilenceMs / 1000) * sampleRate);
    const paddingFrames = Math.floor((options.paddingMs / 1000) * sampleRate);

    // Размер окна анализа: ~10 мс
    const frameSize = Math.max(128, Math.floor(sampleRate * 0.01));
    const totalWindows = Math.floor(totalFrames / frameSize);

    // 1. Поиск активных окон (звук выше порога)
    const isSoundWindow = new Uint8Array(totalWindows);

    for (let w = 0; w < totalWindows; w++) {
      const startIdx = w * frameSize;
      const endIdx = Math.min(startIdx + frameSize, totalFrames);
      let sumSquares = 0;

      for (let i = startIdx; i < endIdx; i++) {
        const val = (Math.abs(leftIn[i]) + Math.abs(rightIn[i])) * 0.5;
        sumSquares += val * val;
      }

      const rms = Math.sqrt(sumSquares / (endIdx - startIdx));
      if (rms >= thresholdLinear) {
        isSoundWindow[w] = 1;
      }
    }

    // 2. Формирование интервалов звука
    interface Interval {
      start: number;
      end: number;
    }
    const soundIntervals: Interval[] = [];
    let inSound = false;
    let currentStart = 0;

    for (let w = 0; w < totalWindows; w++) {
      if (isSoundWindow[w] === 1 && !inSound) {
        inSound = true;
        currentStart = w * frameSize;
      } else if (isSoundWindow[w] === 0 && inSound) {
        // Проверяем длительность наступившей тишины
        let silenceWindowCount = 0;
        let scanW = w;
        while (scanW < totalWindows && isSoundWindow[scanW] === 0) {
          silenceWindowCount++;
          scanW++;
        }

        const silenceDurationFrames = silenceWindowCount * frameSize;
        if (silenceDurationFrames >= minSilenceFrames || scanW === totalWindows) {
          inSound = false;
          soundIntervals.push({
            start: currentStart,
            end: w * frameSize,
          });
        } else {
          // Тишина слишком короткая — продолжаем считать за звук
          w = scanW - 1;
        }
      }
    }

    if (inSound) {
      soundIntervals.push({
        start: currentStart,
        end: totalFrames,
      });
    }

    // Если весь трек тишина или нет пауз
    if (soundIntervals.length === 0) {
      soundIntervals.push({ start: 0, end: Math.min(totalFrames, frameSize) });
    }

    // 3. Добавление padding и объединение перекрывающихся интервалов
    const paddedIntervals: Interval[] = [];
    for (const interval of soundIntervals) {
      const pStart = Math.max(0, interval.start - paddingFrames);
      const pEnd = Math.min(totalFrames, interval.end + paddingFrames);

      if (paddedIntervals.length > 0) {
        const last = paddedIntervals[paddedIntervals.length - 1];
        if (pStart <= last.end) {
          last.end = Math.max(last.end, pEnd);
          continue;
        }
      }
      paddedIntervals.push({ start: pStart, end: pEnd });
    }

    // 4. Подсчет общей длины сшитого аудио
    let totalOutputFrames = 0;
    for (const interval of paddedIntervals) {
      totalOutputFrames += interval.end - interval.start;
    }

    const outL = new Float32Array(totalOutputFrames);
    const outR = new Float32Array(totalOutputFrames);

    // 5. Сшивание с микро-кроссфейдом (32 сэмпла) для устранения щелчков
    const crossfadeLen = 32;
    let writeOffset = 0;

    for (let idx = 0; idx < paddedIntervals.length; idx++) {
      const { start, end } = paddedIntervals[idx];
      const len = end - start;

      for (let i = 0; i < len; i++) {
        let sampleL = leftIn[start + i];
        let sampleR = rightIn[start + i];

        // Fade-in в начале куска
        if (i < crossfadeLen && idx > 0) {
          const factor = i / crossfadeLen;
          sampleL *= factor;
          sampleR *= factor;
        }
        // Fade-out в конце куска
        if (i >= len - crossfadeLen && idx < paddedIntervals.length - 1) {
          const factor = (len - i) / crossfadeLen;
          sampleL *= factor;
          sampleR *= factor;
        }

        outL[writeOffset + i] = sampleL;
        outR[writeOffset + i] = sampleR;
      }

      writeOffset += len;
    }

    // 6. Создание нового AudioBuffer для плеера
    const newBuffer = audioCtx.createBuffer(2, totalOutputFrames, sampleRate);
    newBuffer.copyToChannel(outL, 0);
    newBuffer.copyToChannel(outR, 1);

    const originalDuration = audioBuffer.duration;
    const processedDuration = totalOutputFrames / sampleRate;
    const removedDuration = Math.max(0, originalDuration - processedDuration);
    const percentageSaved = Math.round((removedDuration / originalDuration) * 100) || 0;

    const cutsCount = Math.max(0, paddedIntervals.length - 1);

    return {
      audioBuffer: newBuffer,
      samplesL: outL,
      samplesR: outR,
      stats: {
        originalDuration,
        processedDuration,
        removedDuration,
        percentageSaved,
        cutsCount,
      },
    };
  }

  /**
   * Экспорт готовых сэмплов в MP3 или WAV Blob
   */
  public static exportFile(
    samplesL: Float32Array,
    samplesR: Float32Array,
    sampleRate: number,
    format: "wav" | "mp3"
  ): Blob {
    if (format === "mp3") {
      return encodeMP3(samplesL, samplesR, sampleRate, 256);
    }
    return encodeWAV(samplesL, samplesR, sampleRate);
  }
}