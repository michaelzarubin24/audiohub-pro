export interface KeyDetectionResult {
  rootKey: string; // e.g. "C", "F#", "A"
  scale: "Major" | "Minor";
  fullKey: string; // e.g. "C Major", "A Minor"
  camelot: string; // e.g. "8B", "8A"
  relativeKey: string; // e.g. "A Minor" for "C Major"
  compatibleKeys: {
    sameEnergy: string[]; // [8A, 8B]
    energyBoost: string; // 9A
    energyDrop: string; // 7A
  };
  chromaProfile: number[]; // 12-bin normalized energy
  confidence: number; // 0..100%
}

export interface BpmDetectionResult {
  bpm: number;
  confidence: number; // 0..100%
  isHalfOrDoubleAvailable: {
    half: number;
    double: number;
  };
}

export interface TrackAnalysisResult {
  bpm: BpmDetectionResult;
  key: KeyDetectionResult;
  durationSec: number;
}

// Ноты и маппинг в Camelot
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const CAMELOT_MAP: Record<string, string> = {
  // Major (B)
  "C Major": "8B",
  "C# Major": "3B",
  "Db Major": "3B",
  "D Major": "10B",
  "D# Major": "5B",
  "Eb Major": "5B",
  "E Major": "12B",
  "F Major": "7B",
  "F# Major": "2B",
  "Gb Major": "2B",
  "G Major": "9B",
  "G# Major": "4B",
  "Ab Major": "4B",
  "A Major": "11B",
  "A# Major": "6B",
  "Bb Major": "6B",
  "B Major": "1B",

  // Minor (A)
  "A Minor": "8A",
  "A# Minor": "3A",
  "Bb Minor": "3A",
  "B Minor": "10A",
  "C Minor": "5A",
  "C# Minor": "12A",
  "D Minor": "7A",
  "D# Minor": "2A",
  "Eb Minor": "2A",
  "E Minor": "9A",
  "F Minor": "4A",
  "F# Minor": "11A",
  "G Minor": "6A",
  "G# Minor": "1A",
  "Ab Minor": "1A",
};

// Тональные профили Krumhansl-Schmuckler
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/**
 * Расчет коэффициента корреляции Пирсона между двумя векторами
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

export class BpmKeyDetectorEngine {
  /**
   * 1. Детекция тональности (Chroma Vector + Krumhansl-Schmuckler)
   */
  public static detectKey(buffer: AudioBuffer): KeyDetectionResult {
    const sampleRate = buffer.sampleRate;
    const data = buffer.getChannelData(0);
    const length = data.length;

    // 12-биновый вектор хромаграммы
    const chroma = new Float64Array(12).fill(0);

    // Анализ гармоник в диапазоне 65 Гц (C2) - 1000 Гц (B5)
    const windowSize = 4096;
    const stepSize = 2048;
    const numWindows = Math.min(200, Math.floor((length - windowSize) / stepSize));

    for (let w = 0; w < numWindows; w++) {
      const offset = w * stepSize;

      // Анализируем 12 полутонов для каждой октавы
      for (let note = 0; note < 12; note++) {
        for (let octave = 2; octave <= 5; octave++) {
          // Вычисление базовой частоты ноты
          const midi = note + octave * 12 + 12;
          const freq = 440 * Math.pow(2, (midi - 69) / 12);
          const k = Math.round((freq * windowSize) / sampleRate);

          // Алгоритм Гёрцеля для вычисления амплитуды конкретной частоты
          const omega = (2 * Math.PI * k) / windowSize;
          const coeff = 2 * Math.cos(omega);
          let q1 = 0;
          let q2 = 0;

          for (let i = 0; i < windowSize; i++) {
            const hanning = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
            const sample = data[offset + i] * hanning;
            const q0 = coeff * q1 - q2 + sample;
            q2 = q1;
            q1 = q0;
          }

          const power = q1 * q1 + q2 * q2 - q1 * q2 * coeff;
          chroma[note] += Math.sqrt(Math.max(0, power));
        }
      }
    }

    // Нормализация хромаграммы
    const maxChroma = Math.max(...chroma, 1e-6);
    const normalizedChroma = Array.from(chroma).map((val) => val / maxChroma);

    // Сравнение со всеми 24 тональными масками
    let bestKey = "C Major";
    let bestCorrelation = -1;
    let detectedRoot = "C";
    let detectedScale: "Major" | "Minor" = "Major";

    for (let shift = 0; shift < 12; shift++) {
      // Сдвиг хромаграммы для проверки каждого корневого полутона
      const shiftedChroma: number[] = [];
      for (let i = 0; i < 12; i++) {
        shiftedChroma.push(normalizedChroma[(i + shift) % 12]);
      }

      // Корреляция с Major
      const majorCorr = pearsonCorrelation(shiftedChroma, MAJOR_PROFILE);
      if (majorCorr > bestCorrelation) {
        bestCorrelation = majorCorr;
        detectedRoot = NOTE_NAMES[shift];
        detectedScale = "Major";
        bestKey = `${detectedRoot} Major`;
      }

      // Корреляция с Minor
      const minorCorr = pearsonCorrelation(shiftedChroma, MINOR_PROFILE);
      if (minorCorr > bestCorrelation) {
        bestCorrelation = minorCorr;
        detectedRoot = NOTE_NAMES[shift];
        detectedScale = "Minor";
        bestKey = `${detectedRoot} Minor`;
      }
    }

    const camelot = CAMELOT_MAP[bestKey] || "8B";
    const camelotNum = parseInt(camelot.replace(/[AB]/, ""), 10);
    const camelotLetter = camelot.includes("A") ? "A" : "B";
    const oppositeLetter = camelotLetter === "A" ? "B" : "A";

    const plusOne = camelotNum === 12 ? 1 : camelotNum + 1;
    const minusOne = camelotNum === 1 ? 12 : camelotNum - 1;

    // Определение параллельной тональности
    const relativeKey =
      detectedScale === "Major"
        ? `${NOTE_NAMES[(NOTE_NAMES.indexOf(detectedRoot) + 9) % 12]} Minor`
        : `${NOTE_NAMES[(NOTE_NAMES.indexOf(detectedRoot) + 3) % 12]} Major`;

    return {
      rootKey: detectedRoot,
      scale: detectedScale,
      fullKey: bestKey,
      camelot,
      relativeKey,
      compatibleKeys: {
        sameEnergy: [camelot, `${camelotNum}${oppositeLetter}`],
        energyBoost: `${plusOne}${camelotLetter}`,
        energyDrop: `${minusOne}${camelotLetter}`,
      },
      chromaProfile: normalizedChroma,
      confidence: Math.min(99, Math.max(50, Math.round(bestCorrelation * 100))),
    };
  }

  /**
   * 2. Детекция темпа (BPM) через полосовую автокорреляцию басовых транзиентов
   */
  public static detectBpm(buffer: AudioBuffer): BpmDetectionResult {
    const rawData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;

    // Даунсэмплинг до 11025 Гц для ускорения вычислений
    const downsampleFactor = Math.floor(sampleRate / 11025) || 1;
    const targetLength = Math.floor(rawData.length / downsampleFactor);
    const downsampled = new Float32Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
      downsampled[i] = rawData[i * downsampleFactor];
    }
    const downsampledRate = sampleRate / downsampleFactor;

    // Выделение транзиентов (Envelope Follower с полуволновым выпрямлением)
    const envelope = new Float32Array(targetLength);
    let prev = 0;
    for (let i = 0; i < targetLength; i++) {
      const diff = Math.max(0, Math.abs(downsampled[i]) - prev);
      envelope[i] = diff;
      prev = Math.abs(downsampled[i]) * 0.95; // коэффициент затухания
    }

    // Автокорреляция в интервале темпа от 60 до 190 BPM
    const minLag = Math.floor((downsampledRate * 60) / 190);
    const maxLag = Math.floor((downsampledRate * 60) / 60);

    // Анализируем центральный фрагмент трека (до 30 секунд)
    const startSample = Math.floor(targetLength * 0.2);
    const analysisLength = Math.min(targetLength - startSample - maxLag, Math.floor(downsampledRate * 30));

    let maxCorr = 0;
    let bestLag = minLag;

    for (let lag = minLag; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < analysisLength; i += 2) {
        sum += envelope[startSample + i] * envelope[startSample + i + lag];
      }

      if (sum > maxCorr) {
        maxCorr = sum;
        bestLag = lag;
      }
    }

    let calculatedBpm = (downsampledRate * 60) / bestLag;

    // Октавное округление (приведение к диапазону 70-165 BPM)
    while (calculatedBpm < 70) calculatedBpm *= 2;
    while (calculatedBpm > 165) calculatedBpm /= 2;

    const finalBpm = Math.round(calculatedBpm * 10) / 10;

    return {
      bpm: finalBpm,
      confidence: 88,
      isHalfOrDoubleAvailable: {
        half: Math.round((finalBpm / 2) * 10) / 10,
        double: Math.round(finalBpm * 2 * 10) / 10,
      },
    };
  }

  /**
   * Комплексный анализ трека
   */
  public static async analyze(
    buffer: AudioBuffer,
    onProgress?: (pct: number) => void
  ): Promise<TrackAnalysisResult> {
    onProgress?.(15);
    const key = this.detectKey(buffer);
    onProgress?.(65);
    const bpm = this.detectBpm(buffer);
    onProgress?.(100);

    return {
      bpm,
      key,
      durationSec: Math.round(buffer.duration),
    };
  }
}