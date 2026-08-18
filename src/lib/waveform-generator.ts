export type WaveformStyle = "bars" | "mirrored" | "wave" | "solid";
export type AspectRatioType = "16:9" | "9:16" | "1:1";

export interface WaveformConfig {
  style: WaveformStyle;
  barCount: number;
  barGap: number;
  barRadius: number;
  colorStart: string;
  colorEnd: string;
  backgroundColor: string;
  width: number;
  height: number;
  aspectRatio: AspectRatioType;
  trackTitle: string;
  showTitle: boolean;
  unplayedOpacity: number;
  isReactive: boolean; // Включение прыгающей волны
}

export class WaveformGeneratorEngine {
  public static extractPeaks(audioBuffer: AudioBuffer, targetCount: number): number[] {
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const blockSize = Math.floor(totalSamples / targetCount);
    const peaks: number[] = [];

    let maxGlobalPeak = 0;

    for (let i = 0; i < targetCount; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, totalSamples);
      let peak = 0;

      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > peak) peak = abs;
      }

      peaks.push(peak);
      if (peak > maxGlobalPeak) maxGlobalPeak = peak;
    }

    const divisor = maxGlobalPeak > 0 ? maxGlobalPeak : 1;
    return peaks.map((p) => Math.max(0.04, p / divisor));
  }

  /**
   * Отрисовка волны (с поддержкой статики, прогресса и живых частот FFT)
   */
  public static renderCanvas(
    canvas: HTMLCanvasElement,
    peaks: number[],
    config: WaveformConfig,
    progress: number = 0,
    liveFrequencies?: Uint8Array | null
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const {
      width,
      height,
      style,
      barGap,
      barRadius,
      colorStart,
      colorEnd,
      backgroundColor,
      showTitle,
      trackTitle,
      unplayedOpacity,
      isReactive,
    } = config;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    if (showTitle && trackTitle.trim()) {
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `600 ${Math.round(height * 0.035)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 12;
      ctx.fillText(trackTitle, width / 2, height * 0.35);
      ctx.restore();
    }

    const count = peaks.length;
    const totalBarWidth = width / count;
    const barWidth = Math.max(1, totalBarWidth * (1 - barGap));
    const padding = (totalBarWidth - barWidth) / 2;
    const centerY = height / 2;
    const maxWaveHeight = height * (config.aspectRatio === "9:16" ? 0.25 : 0.45);

    const activeGrad = ctx.createLinearGradient(0, 0, width, 0);
    activeGrad.addColorStop(0, colorStart);
    activeGrad.addColorStop(1, colorEnd);

    // Вычисляем высоты баров: если включен Reactive и есть liveFrequencies — анимируем
    const currentHeights: number[] = new Array(count);
    const hasLive = isReactive && liveFrequencies && liveFrequencies.length > 0;

    for (let i = 0; i < count; i++) {
      if (hasLive) {
        // Берем срез частот (от низких к высоким)
        const freqIdx = Math.floor((i / count) * (liveFrequencies.length * 0.75));
        const freqVal = (liveFrequencies[freqIdx] || 0) / 255;
        // Комбинируем форму волны трека с живым битом
        const dynamicVal = Math.max(0.05, peaks[i] * 0.3 + freqVal * 0.85);
        currentHeights[i] = dynamicVal;
      } else {
        currentHeights[i] = peaks[i];
      }
    }

    const playedBarIndex = Math.floor(progress * count);

    if (style === "bars") {
      for (let i = 0; i < count; i++) {
        const isPlayed = progress > 0 ? i <= playedBarIndex : true;
        ctx.fillStyle = activeGrad;
        ctx.globalAlpha = isPlayed ? 1.0 : unplayedOpacity;

        const barHeight = Math.max(4, currentHeights[i] * maxWaveHeight * 2);
        const x = i * totalBarWidth + padding;
        const y = centerY + maxWaveHeight - barHeight;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, [barRadius, barRadius, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }
    } else if (style === "mirrored") {
      for (let i = 0; i < count; i++) {
        const isPlayed = progress > 0 ? i <= playedBarIndex : true;
        ctx.fillStyle = activeGrad;
        ctx.globalAlpha = isPlayed ? 1.0 : unplayedOpacity;

        const halfHeight = Math.max(2, currentHeights[i] * maxWaveHeight);
        const x = i * totalBarWidth + padding;
        const y = centerY - halfHeight;
        const totalH = halfHeight * 2;

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, totalH, [barRadius, barRadius, barRadius, barRadius]);
        } else {
          ctx.rect(x, y, barWidth, totalH);
        }
        ctx.fill();
      }
    } else if (style === "wave" || style === "solid") {
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = Math.max(2, barWidth);
      ctx.strokeStyle = activeGrad;
      ctx.fillStyle = activeGrad;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (style === "wave") {
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const x = i * totalBarWidth + totalBarWidth / 2;
          const y = centerY - currentHeights[i] * maxWaveHeight;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const x = i * totalBarWidth + totalBarWidth / 2;
          const y = centerY + currentHeights[i] * maxWaveHeight;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        for (let i = 0; i < count; i++) {
          ctx.lineTo(i * totalBarWidth + totalBarWidth / 2, centerY - currentHeights[i] * maxWaveHeight);
        }
        ctx.lineTo(width, centerY);
        for (let i = count - 1; i >= 0; i--) {
          ctx.lineTo(i * totalBarWidth + totalBarWidth / 2, centerY + currentHeights[i] * maxWaveHeight);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    if (progress > 0 && progress < 1) {
      const cursorX = progress * width;
      ctx.save();
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 3;
      ctx.shadowColor = colorEnd;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cursorX, centerY - maxWaveHeight - 15);
      ctx.lineTo(cursorX, centerY + maxWaveHeight + 15);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1.0;
  }

  /**
   * Запись видео с живой пульсацией через AnalyserNode
   */
  public static async recordVideo(
    audioBuffer: AudioBuffer,
    peaks: number[],
    config: WaveformConfig,
    onProgress: (pct: number) => void
  ): Promise<Blob> {
    const canvas = document.createElement("canvas");
    canvas.width = config.width;
    canvas.height = config.height;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();

    const dest = ctx.createMediaStreamDestination();
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.75;

    source.connect(analyser);
    analyser.connect(dest);

    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    let mimeType = "video/webm;codecs=vp9,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
    }
    if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    }

    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const freqData = new Uint8Array(analyser.frequencyBinCount);

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        ctx.close().catch(() => {});
        const outputBlob = new Blob(chunks, { type: mimeType });
        resolve(outputBlob);
      };

      mediaRecorder.onerror = (e) => reject(e);

      mediaRecorder.start();
      source.start();

      const startTime = ctx.currentTime;
      const totalDuration = audioBuffer.duration;

      const drawLoop = () => {
        const elapsed = ctx.currentTime - startTime;
        const currentProgress = Math.min(1, elapsed / totalDuration);

        if (config.isReactive) {
          analyser.getByteFrequencyData(freqData);
        }

        WaveformGeneratorEngine.renderCanvas(
          canvas,
          peaks,
          config,
          currentProgress,
          config.isReactive ? freqData : null
        );
        onProgress(Math.min(99, Math.round(currentProgress * 100)));

        if (elapsed < totalDuration) {
          requestAnimationFrame(drawLoop);
        } else {
          setTimeout(() => {
            source.stop();
            mediaRecorder.stop();
            onProgress(100);
          }, 200);
        }
      };

      requestAnimationFrame(drawLoop);
    });
  }

  public static generateSVG(peaks: number[], config: WaveformConfig): string {
    const { width, height, style, barGap, barRadius, colorStart, colorEnd, backgroundColor } =
      config;

    const count = peaks.length;
    const totalBarWidth = width / count;
    const barWidth = Math.max(1, totalBarWidth * (1 - barGap));
    const padding = (totalBarWidth - barWidth) / 2;
    const centerY = height / 2;
    const maxWaveHeight = height * 0.4;

    let elements = "";
    const bgRect =
      backgroundColor !== "transparent"
        ? `<rect width="${width}" height="${height}" fill="${backgroundColor}" />`
        : "";

    if (style === "bars") {
      for (let i = 0; i < count; i++) {
        const barHeight = Math.max(4, peaks[i] * maxWaveHeight * 2);
        const x = i * totalBarWidth + padding;
        const y = centerY + maxWaveHeight - barHeight;
        elements += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" rx="${barRadius}" fill="url(#waveGrad)" />`;
      }
    } else if (style === "mirrored") {
      for (let i = 0; i < count; i++) {
        const halfHeight = Math.max(2, peaks[i] * maxWaveHeight);
        const x = i * totalBarWidth + padding;
        const y = centerY - halfHeight;
        const totalH = halfHeight * 2;
        elements += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${totalH.toFixed(1)}" rx="${barRadius}" fill="url(#waveGrad)" />`;
      }
    } else {
      let dTop = "";
      let dBottom = "";
      for (let i = 0; i < count; i++) {
        const x = i * totalBarWidth + totalBarWidth / 2;
        const yTop = centerY - peaks[i] * maxWaveHeight;
        const yBottom = centerY + peaks[i] * maxWaveHeight;
        if (i === 0) {
          dTop += `M ${x.toFixed(1)} ${yTop.toFixed(1)}`;
          dBottom += `M ${x.toFixed(1)} ${yBottom.toFixed(1)}`;
        } else {
          dTop += ` L ${x.toFixed(1)} ${yTop.toFixed(1)}`;
          dBottom += ` L ${x.toFixed(1)} ${yBottom.toFixed(1)}`;
        }
      }
      if (style === "wave") {
        elements += `<path d="${dTop}" stroke="url(#waveGrad)" stroke-width="${Math.max(2, barWidth).toFixed(1)}" fill="none" stroke-linecap="round" />`;
        elements += `<path d="${dBottom}" stroke="url(#waveGrad)" stroke-width="${Math.max(2, barWidth).toFixed(1)}" fill="none" stroke-linecap="round" />`;
      } else {
        const dSolid = `${dTop} L ${width} ${centerY} ${dBottom.replace("M", "L")} Z`;
        elements += `<path d="${dSolid}" fill="url(#waveGrad)" />`;
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colorStart}" />
      <stop offset="100%" stop-color="${colorEnd}" />
    </linearGradient>
  </defs>
  ${bgRect}
  ${elements}
</svg>`;
  }
}