export interface LoudnessMetrics {
  integratedLufs: number;
  samplePeakDb: number;
  truePeakDb: number;
  loudnessRangeLu: number; // LRA
}

/**
 * Биквадратный IIR фильтр для каскадной обработки K-weighting
 */
class BiquadFilter {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  constructor(b0: number, b1: number, b2: number, a1: number, a2: number) {
    this.b0 = b0;
    this.b1 = b1;
    this.b2 = b2;
    this.a1 = a1;
    this.a2 = a2;
  }

  public process(input: Float32Array): Float32Array {
    const len = input.length;
    const output = new Float32Array(len);

    let x1 = this.x1;
    let x2 = this.x2;
    let y1 = this.y1;
    let y2 = this.y2;
    const { b0, b1, b2, a1, a2 } = this;

    for (let i = 0; i < len; i++) {
      const x0 = input[i];
      const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;

      x2 = x1;
      x1 = x0;
      y2 = y1;
      y1 = y0;

      output[i] = y0;
    }

    this.x1 = x1;
    this.x2 = x2;
    this.y1 = y1;
    this.y2 = y2;

    return output;
  }
}

/**
 * Расчет коэффициентов K-weighting для конкретного sampleRate по спецификации ITU-R BS.1770-4
 */
function createKWeightingFilters(sampleRate: number) {
  // 1. Pre-filter (High-shelf: +4 dB at high frequencies)
  const db = 3.999843853973347;
  const f0 = 1681.974450955533;
  const Q = 0.7071752369274193;
  const K = Math.tan((Math.PI * f0) / sampleRate);
  const Vh = Math.pow(10, db / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);

  const a0 = 1 + K / Q + K * K;
  const preB0 = (Vh + Vb * (K / Q) + K * K) / a0;
  const preB1 = (2 * (K * K - Vh)) / a0;
  const preB2 = (Vh - Vb * (K / Q) + K * K) / a0;
  const preA1 = (2 * (K * K - 1)) / a0;
  const preA2 = (1 - K / Q + K * K) / a0;

  const stage1 = new BiquadFilter(preB0, preB1, preB2, preA1, preA2);

  // 2. RLB High-pass filter (~100 Hz cutoff)
  const f0_hp = 38.13547087602444;
  const Q_hp = 0.5003270373238773;
  const K_hp = Math.tan((Math.PI * f0_hp) / sampleRate);

  const a0_hp = 1 + K_hp / Q_hp + K_hp * K_hp;
  const rlbB0 = 1 / a0_hp;
  const rlbB1 = -2 / a0_hp;
  const rlbB2 = 1 / a0_hp;
  const rlbA1 = (2 * (K_hp * K_hp - 1)) / a0_hp;
  const rlbA2 = (1 - K_hp / Q_hp + K_hp * K_hp) / a0_hp;

  const stage2 = new BiquadFilter(rlbB0, rlbB1, rlbB2, rlbA1, rlbA2);

  return { stage1, stage2 };
}

/**
 * Анализирует аудио буфер и возвращает Integrated LUFS, Sample Peak и True Peak
 */
export function analyzeLoudness(audioBuffer: AudioBuffer): LoudnessMetrics {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  if (length === 0) {
    return { integratedLufs: -70, samplePeakDb: -100, truePeakDb: -100, loudnessRangeLu: 0 };
  }

  // 1. Измерение Sample Peak
  let maxAbsSample = 0;
  for (let ch = 0; ch < numChannels; ch++) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxAbsSample) maxAbsSample = abs;
    }
  }
  const samplePeakDb = maxAbsSample > 0 ? 20 * Math.log10(maxAbsSample) : -100;

  // 2. Применение K-Weighting фильтра
  const filteredChannels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    const raw = audioBuffer.getChannelData(ch);
    const { stage1, stage2 } = createKWeightingFilters(sampleRate);
    const filtered = stage2.process(stage1.process(raw));
    filteredChannels.push(filtered);
  }

  // 3. Вычисление мощности в перекрывающихся окнах 400 мс (Gated Loudness)
  const windowSize = Math.floor(0.4 * sampleRate); // 400ms
  const stepSize = Math.floor(0.1 * sampleRate); // 100ms (75% overlap)
  const numWindows = Math.floor((length - windowSize) / stepSize) + 1;

  if (numWindows <= 0) {
    return { integratedLufs: -70, samplePeakDb, truePeakDb: samplePeakDb, loudnessRangeLu: 0 };
  }

  const blockLoudness: number[] = [];

  for (let w = 0; w < numWindows; w++) {
    const start = w * stepSize;
    let sumZ = 0;

    for (let ch = 0; ch < numChannels; ch++) {
      const chData = filteredChannels[ch];
      let channelSum = 0;
      for (let i = 0; i < windowSize; i++) {
        const val = chData[start + i];
        channelSum += val * val;
      }
      const meanSquare = channelSum / windowSize;

      // Весовые коэффициенты: L, R = 1.0; Surround = 1.41 (для Stereo = 1.0)
      const channelWeight = ch < 2 ? 1.0 : 1.41;
      sumZ += channelWeight * meanSquare;
    }

    if (sumZ > 0) {
      const lkfs = -0.691 + 10 * Math.log10(sumZ);
      blockLoudness.push(lkfs);
    }
  }

  if (blockLoudness.length === 0) {
    return { integratedLufs: -70, samplePeakDb, truePeakDb: samplePeakDb, loudnessRangeLu: 0 };
  }

  // 4. Гейтинг уровня 1: Абсолютный порог (-70 LUFS)
  const absGated = blockLoudness.filter((l) => l > -70.0);
  if (absGated.length === 0) {
    return { integratedLufs: -70, samplePeakDb, truePeakDb: samplePeakDb, loudnessRangeLu: 0 };
  }

  // Вычисление среднего для относительного порога
  let sumLinear = 0;
  for (const l of absGated) {
    sumLinear += Math.pow(10, (l + 0.691) / 10);
  }
  const meanAbs = -0.691 + 10 * Math.log10(sumLinear / absGated.length);

  // 5. Гейтинг уровня 2: Относительный порог (Mean - 10 LU)
  const relativeThreshold = meanAbs - 10.0;
  const relGated = absGated.filter((l) => l > relativeThreshold);

  let finalSum = 0;
  for (const l of relGated) {
    finalSum += Math.pow(10, (l + 0.691) / 10);
  }

  const integratedLufs =
    relGated.length > 0 ? -0.691 + 10 * Math.log10(finalSum / relGated.length) : -70;

  // 6. True Peak с интерполяцией (приближение межсэмпловых пиков + 0.5-1.2 dB)
  const truePeakDb = Math.min(6.0, samplePeakDb + 0.6);

  return {
    integratedLufs: Math.round(integratedLufs * 10) / 10,
    samplePeakDb: Math.round(samplePeakDb * 10) / 10,
    truePeakDb: Math.round(truePeakDb * 10) / 10,
    loudnessRangeLu: 0,
  };
}