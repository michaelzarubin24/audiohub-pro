export interface StereoWidenerOptions {
  widthPct: number; // 0% (Mono) - 100% (Normal) - 250% (Super Wide)
  bassMonoFreq: number; // 0 (Off), 80Hz, 120Hz, 180Hz, 250Hz
  haasDelayMs: number; // 0ms - 25ms (micro-delay widening)
  midGainDb: number; // -6dB .. +6dB
  sideGainDb: number; // -6dB .. +6dB
}

export interface StereoAnalysisMetrics {
  correlation: number; // -1.0 .. +1.0
  stereoBalance: number; // -1.0 (Left) .. +1.0 (Right)
  midEnergy: number;
  sideEnergy: number;
}

export class StereoWidenerEngine {
  /**
   * 1. Расчет коэффициента корреляции фаз (-1.0 .. +1.0)
   */
  public static calculateCorrelation(
    left: Float32Array,
    right: Float32Array
  ): StereoAnalysisMetrics {
    const len = Math.min(left.length, right.length);
    if (len === 0) {
      return { correlation: 1.0, stereoBalance: 0, midEnergy: 0, sideEnergy: 0 };
    }

    let sumDot = 0;
    let sumL2 = 0;
    let sumR2 = 0;
    let sumMid2 = 0;
    let sumSide2 = 0;

    // Шаг выборки для ускорения анализа длинных треков
    const step = Math.max(1, Math.floor(len / 40000));

    for (let i = 0; i < len; i += step) {
      const l = left[i];
      const r = right[i];
      const mid = (l + r) * 0.7071;
      const side = (l - r) * 0.7071;

      sumDot += l * r;
      sumL2 += l * l;
      sumR2 += r * r;
      sumMid2 += mid * mid;
      sumSide2 += side * side;
    }

    const denom = Math.sqrt(sumL2 * sumR2);
    const correlation = denom > 0 ? sumDot / denom : 1.0;
    const balance = sumL2 + sumR2 > 0 ? (sumR2 - sumL2) / (sumL2 + sumR2) : 0;

    return {
      correlation: Math.max(-1.0, Math.min(1.0, Math.round(correlation * 100) / 100)),
      stereoBalance: Math.round(balance * 100) / 100,
      midEnergy: sumMid2,
      sideEnergy: sumSide2,
    };
  }

  /**
   * 2. Оффлайн-рендеринг Mid/Side расширения и Mono-Bass фильтрации
   */
  public static async process(
    sourceBuffer: AudioBuffer,
    options: StereoWidenerOptions,
    onProgress?: (pct: number) => void
  ): Promise<AudioBuffer> {
    onProgress?.(10);

    const length = sourceBuffer.length;
    const sampleRate = sourceBuffer.sampleRate;
    const numChannels = sourceBuffer.numberOfChannels;

    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);
    const sourceNode = offlineCtx.createBufferSource();
    sourceNode.buffer = sourceBuffer;

    // Входные каналы Left / Right
    const srcLeft = sourceBuffer.getChannelData(0);
    const srcRight =
      numChannels > 1 ? sourceBuffer.getChannelData(1) : sourceBuffer.getChannelData(0);

    // Буферы для вычислений
    const outLeft = new Float32Array(length);
    const outRight = new Float32Array(length);

    const widthScale = options.widthPct / 100;
    const midLinear = Math.pow(10, options.midGainDb / 20);
    const sideLinear = Math.pow(10, options.sideGainDb / 20) * widthScale;

    // Haas задержка в сэмплах
    const haasSamples = Math.floor((options.haasDelayMs / 1000) * sampleRate);

    // Коэффициент простого High-Pass фильтра для Side-канала (Mono-Bass)
    let sideHpAlpha = 1.0;
    if (options.bassMonoFreq > 20) {
      const rc = 1.0 / (2.0 * Math.PI * options.bassMonoFreq);
      const dt = 1.0 / sampleRate;
      sideHpAlpha = rc / (rc + dt);
    }

    let prevSideIn = 0;
    let prevSideOut = 0;

    onProgress?.(30);

    for (let i = 0; i < length; i++) {
      const l = srcLeft[i];
      // Применение Haas задержки к правому каналу
      const rIdx = i - haasSamples;
      const r = rIdx >= 0 ? srcRight[rIdx] : srcRight[0];

      // 1. Mid / Side преобразование
      const mid = (l + r) * 0.5 * midLinear;
      let side = (l - r) * 0.5;

      // 2. High-Pass фильтр на Side канале (Mono-Maker)
      if (options.bassMonoFreq > 20) {
        const hpSide = sideHpAlpha * (prevSideOut + side - prevSideIn);
        prevSideIn = side;
        prevSideOut = hpSide;
        side = hpSide;
      }

      side *= sideLinear;

      // 3. Обратное декодирование в Left / Right
      outLeft[i] = mid + side;
      outRight[i] = mid - side;
    }

    onProgress?.(80);

    const resultBuffer = offlineCtx.createBuffer(2, length, sampleRate);
    resultBuffer.getChannelData(0).set(outLeft);
    resultBuffer.getChannelData(1).set(outRight);

    onProgress?.(100);
    return resultBuffer;
  }
}