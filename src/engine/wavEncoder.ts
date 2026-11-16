/**
 * Zero-dependency RIFF 16-bit stereo PCM WAV encoder.
 */
export function encodeWav(left: Float32Array, right: Float32Array, sampleRate: number): Uint8Array {
  const numSamples = Math.min(left.length, right.length);
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write interleaved 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    const intL = sL < 0 ? Math.round(sL * 0x8000) : Math.round(sL * 0x7FFF);
    view.setInt16(offset, intL, true);
    offset += 2;

    const sR = Math.max(-1, Math.min(1, right[i]));
    const intR = sR < 0 ? Math.round(sR * 0x8000) : Math.round(sR * 0x7FFF);
    view.setInt16(offset, intR, true);
    offset += 2;
  }

  return new Uint8Array(arrayBuffer);
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
