import { Mp3Encoder } from "@breezystack/lamejs";

export function encodeMP3(
  samplesL: Float32Array,
  samplesR: Float32Array,
  sampleRate: number,
  kbps: number = 192
): Blob {
  const mp3encoder = new Mp3Encoder(2, sampleRate, kbps);
  const mp3Data: Uint8Array[] = [];

  const leftInt16 = new Int16Array(samplesL.length);
  const rightInt16 = new Int16Array(samplesR.length);

  for (let i = 0; i < samplesL.length; i++) {
    const sL = Math.max(-1, Math.min(1, samplesL[i]));
    leftInt16[i] = sL < 0 ? sL * 0x8000 : sL * 0x7fff;

    const sR = Math.max(-1, Math.min(1, samplesR[i]));
    rightInt16[i] = sR < 0 ? sR * 0x8000 : sR * 0x7fff;
  }

  const sampleBlockSize = 1152;
  for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(new Uint8Array(endBuf));
  }

  return new Blob(mp3Data as BlobPart[], { type: "audio/mp3" });
}