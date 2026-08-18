export type SpatialPattern = "circle-cw" | "circle-ccw" | "figure8" | "pendulum";
export type ReverbSpace = "studio" | "hall" | "cathedral" | "dry";

export interface Spatial8DOptions {
  speedSec: number; // время полного оборота (напр. 12s)
  radius: number; // радиус орбиты / ширина сцены (1.0 - 5.0)
  pattern: SpatialPattern;
  reverbSpace: ReverbSpace;
  reverbWet: number; // 0.0 - 0.6
  elevation: number; // -1.0 .. 1.0 (высота источника)
}

export class Spatial8DEngine {
  /**
   * Синтез чистой импульсной характеристики реверберации помещения
   */
  public static createSyntheticImpulse(
    ctx: BaseAudioContext,
    duration = 2.5,
    decay = 2.0
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * decay);
      // Стерео-диффузный белый шум с экспоненциальным затуханием
      left[i] = (Math.random() * 2 - 1) * env;
      right[i] = (Math.random() * 2 - 1) * env;
    }

    return impulse;
  }

  /**
   * Вычисление 3D координат (X, Y, Z) в момент времени t
   */
  public static calculatePosition(
    timeSec: number,
    options: Spatial8DOptions
  ): { x: number; y: number; z: number } {
    const { speedSec, radius, pattern, elevation } = options;
    const period = Math.max(1, speedSec);
    const progress = (timeSec % period) / period;
    const theta = progress * 2 * Math.PI;

    let x = 0;
    let y = elevation * 0.5;
    let z = 0;

    switch (pattern) {
      case "circle-cw": // По часовой стрелке
        x = Math.sin(theta) * radius;
        z = Math.cos(theta) * radius;
        break;

      case "circle-ccw": // Против часовой стрелки
        x = -Math.sin(theta) * radius;
        z = Math.cos(theta) * radius;
        break;

      case "figure8": // Восьмерка / Бесконечность
        x = Math.sin(theta) * radius;
        z = (Math.sin(2 * theta) / 1.6) * radius;
        y = elevation * 0.5 + Math.cos(theta) * 0.4;
        break;

      case "pendulum": // Маятниковое раскачивание влево-вправо
        x = Math.sin(theta) * radius;
        z = Math.abs(Math.cos(theta)) * 0.5 * radius;
        break;
    }

    return { x, y, z };
  }

  /**
   * Полный оффлайн-рендеринг трека в 8D AudioBuffer
   */
  public static async render8D(
    sourceBuffer: AudioBuffer,
    options: Spatial8DOptions,
    onProgress?: (pct: number) => void
  ): Promise<AudioBuffer> {
    onProgress?.(5);

    const length = sourceBuffer.length;
    const sampleRate = sourceBuffer.sampleRate;
    const duration = sourceBuffer.duration;

    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

    // 1. Источник аудио
    const sourceNode = offlineCtx.createBufferSource();
    sourceNode.buffer = sourceBuffer;

    // 2. HRTF 3D Panner
    const panner = offlineCtx.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 1;
    panner.maxDistance = 10000;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;

    // Слушатель смотрит прямо вперед
    if (offlineCtx.listener.forwardX) {
      offlineCtx.listener.forwardX.setValueAtTime(0, 0);
      offlineCtx.listener.forwardY.setValueAtTime(0, 0);
      offlineCtx.listener.forwardZ.setValueAtTime(-1, 0);
      offlineCtx.listener.upX.setValueAtTime(0, 0);
      offlineCtx.listener.upY.setValueAtTime(1, 0);
      offlineCtx.listener.upZ.setValueAtTime(0, 0);
    }

    // 3. Автоматизация траектории движения в 3D пространстве
    const timeStep = 0.05; // обновление координат каждые 50 мс
    const totalSteps = Math.ceil(duration / timeStep);

    for (let step = 0; step < totalSteps; step++) {
      const t = step * timeStep;
      const pos = this.calculatePosition(t, options);

      panner.positionX.setValueAtTime(pos.x, t);
      panner.positionY.setValueAtTime(pos.y, t);
      panner.positionZ.setValueAtTime(pos.z, t);
    }

    onProgress?.(30);

    // 4. Реверберационная комната (Ambience)
    let finalOutputNode: AudioNode = panner;

    if (options.reverbSpace !== "dry" && options.reverbWet > 0) {
      const convolver = offlineCtx.createConvolver();
      const reverbDuration =
        options.reverbSpace === "cathedral"
          ? 4.0
          : options.reverbSpace === "hall"
          ? 2.5
          : 1.2;
      const reverbDecay =
        options.reverbSpace === "cathedral"
          ? 1.5
          : options.reverbSpace === "hall"
          ? 2.2
          : 3.5;

      convolver.buffer = this.createSyntheticImpulse(
        offlineCtx,
        reverbDuration,
        reverbDecay
      );

      const dryGain = offlineCtx.createGain();
      const wetGain = offlineCtx.createGain();

      dryGain.gain.setValueAtTime(1 - options.reverbWet * 0.5, 0);
      wetGain.gain.setValueAtTime(options.reverbWet, 0);

      panner.connect(dryGain);
      panner.connect(convolver);
      convolver.connect(wetGain);

      const merger = offlineCtx.createGain();
      dryGain.connect(merger);
      wetGain.connect(merger);

      finalOutputNode = merger;
    }

    finalOutputNode.connect(offlineCtx.destination);
    sourceNode.connect(panner);
    sourceNode.start(0);

    onProgress?.(50);

    const renderedBuffer = await offlineCtx.startRendering();
    onProgress?.(100);

    return renderedBuffer;
  }
}