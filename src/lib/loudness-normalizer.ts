import { analyzeLoudness, LoudnessMetrics } from "./loudness-meter";

export interface NormalizerOptions {
  targetLufs: number; // e.g. -14.0 LUFS
  targetPeakCeilingDb: number; // e.g. -1.0 dB
  enableLimiter: boolean; // включение brickwall лимитера
}

export interface NormalizationResult {
  processedBuffer: AudioBuffer;
  gainAppliedDb: number;
  originalMetrics: LoudnessMetrics;
  finalMetrics: LoudnessMetrics;
}

export class LoudnessNormalizerEngine {
  /**
   * Студийный Lookahead Peak Limiter для предотвращения клиппинга
   */
  private static applyLookaheadLimiter(
    channels: Float32Array[],
    sampleRate: number,
    ceilingDb: number
  ): Float32Array[] {
    const numChannels = channels.length;
    const length = channels[0].length;
    const ceilingLinear = Math.pow(10, ceilingDb / 20);

    // Lookahead 5ms, Release 80ms
    const lookaheadSamples = Math.max(1, Math.floor(0.005 * sampleRate));
    const releaseTimeSec = 0.08;
    const releaseCoeff = Math.exp(-1 / (releaseTimeSec * sampleRate));

    const outputChannels = channels.map(() => new Float32Array(length));
    const delayBuffers = channels.map(() => new Float32Array(lookaheadSamples));

    let envelope = 0;

    for (let i = 0; i < length + lookaheadSamples; i++) {
      // 1. Поиск максимального пика по всем каналам (Stereo Linking)
      let currentPeak = 0;
      if (i < length) {
        for (let ch = 0; ch < numChannels; ch++) {
          const abs = Math.abs(channels[ch][i]);
          if (abs > currentPeak) currentPeak = abs;
        }
      }

      // 2. Расчет огибающей сжатия
      if (currentPeak > envelope) {
        envelope = currentPeak;
      } else {
        envelope = currentPeak + releaseCoeff * (envelope - currentPeak);
      }

      // 3. Вычисление коэффициента ослабления
      let gainReduction = 1.0;
      if (envelope > ceilingLinear) {
        gainReduction = ceilingLinear / envelope;
      }

      // 4. Задержка сигнала на величину lookahead и применение гейна
      const outIdx = i - lookaheadSamples;
      if (outIdx >= 0 && outIdx < length) {
        for (let ch = 0; ch < numChannels; ch++) {
          const delayedSample = delayBuffers[ch][0];
          outputChannels[ch][outIdx] = delayedSample * gainReduction;
        }
      }

      // 5. Сдвиг буфера задержки
      if (i < length) {
        for (let ch = 0; ch < numChannels; ch++) {
          for (let d = 0; d < lookaheadSamples - 1; d++) {
            delayBuffers[ch][d] = delayBuffers[ch][d + 1];
          }
          delayBuffers[ch][lookaheadSamples - 1] = channels[ch][i];
        }
      }
    }

    return outputChannels;
  }

  /**
   * Выполняет полный цикл нормализации громкости
   */
  public static async process(
    sourceBuffer: AudioBuffer,
    options: NormalizerOptions,
    onProgress: (pct: number) => void
  ): Promise<NormalizationResult> {
    onProgress(10);

    // 1. Анализ исходных метрик
    const originalMetrics = analyzeLoudness(sourceBuffer);
    onProgress(30);

    const numChannels = sourceBuffer.numberOfChannels;
    const sampleRate = sourceBuffer.sampleRate;
    const length = sourceBuffer.length;

    // 2. Расчет необходимого усиления (Target - Current)
    const gainAppliedDb = options.targetLufs - originalMetrics.integratedLufs;
    const gainLinear = Math.pow(10, gainAppliedDb / 20);

    // 3. Применение расчетного усиления к дорожкам
    const boostedChannels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) {
      const srcData = sourceBuffer.getChannelData(ch);
      const boosted = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        boosted[i] = srcData[i] * gainLinear;
      }
      boostedChannels.push(boosted);
    }
    onProgress(60);

    // 4. Лимитирование пиков при превышении потолка
    let finalChannels = boostedChannels;
    if (options.enableLimiter) {
      finalChannels = this.applyLookaheadLimiter(
        boostedChannels,
        sampleRate,
        options.targetPeakCeilingDb
      );
    }
    onProgress(80);

    // 5. Формирование результирующего AudioBuffer через прямой .set()
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();

    const outputBuffer = ctx.createBuffer(numChannels, length, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      outputBuffer.getChannelData(ch).set(finalChannels[ch]);
    }
    ctx.close().catch(() => {});

    // 6. Измерение финальных показателей
    const finalMetrics = analyzeLoudness(outputBuffer);
    onProgress(100);

    return {
      processedBuffer: outputBuffer,
      gainAppliedDb: Math.round(gainAppliedDb * 10) / 10,
      originalMetrics,
      finalMetrics,
    };
  }
}