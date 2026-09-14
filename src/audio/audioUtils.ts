/**
 * Converts Float32 audio samples (-1.0 to 1.0) into 16-bit linear PCM little-endian ArrayBuffer
 */
export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    // 0x7FFF is 32767 for positive, 0x8000 is -32768 for negative
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return output.buffer;
}

/**
 * Encodes an ArrayBuffer into a base64 string cleanly
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  // Chunking to avoid RangeError on large buffers
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string into an ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Decodes raw 24kHz PCM16 little-endian audio bytes from Gemini Live
 * into a Web Audio API AudioBuffer ready to play
 */
export function pcm16ToAudioBuffer(
  pcm16Buffer: ArrayBuffer,
  audioCtx: AudioContext,
  sampleRate = 24000
): AudioBuffer {
  const dataView = new DataView(pcm16Buffer);
  const sampleCount = Math.floor(pcm16Buffer.byteLength / 2);
  const audioBuffer = audioCtx.createBuffer(1, sampleCount, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < sampleCount; i++) {
    const int16 = dataView.getInt16(i * 2, true);
    // Convert -32768..32767 to -1.0..1.0
    channelData[i] = int16 < 0 ? int16 / 32768.0 : int16 / 32767.0;
  }

  return audioBuffer;
}

/**
 * Downsamples audio buffer from input sample rate (e.g. 48000 or 44100)
 * to output target rate (16000 Hz) using linear interpolation
 */
export function downsampleBuffer(
  buffer: Float32Array,
  inputRate: number,
  outputRate = 16000
): Float32Array {
  if (inputRate === outputRate) {
    return buffer;
  }
  if (inputRate < outputRate) {
    // If lower than target, return as-is
    return buffer;
  }

  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

/**
 * Calculates Root Mean Square (RMS) volume from a Float32Array
 */
export function calculateRMS(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}
