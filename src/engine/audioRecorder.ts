import { encodeWav } from './wavEncoder';

export interface RecordResult {
  wavBytes: Uint8Array;
  durationSec: number;
  blobUrl: string;
}

export class AudioRecorder {
  private state: 'idle' | 'recording' = 'idle';
  private leftChunks: Float32Array[] = [];
  private rightChunks: Float32Array[] = [];
  private totalSamples = 0;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: AudioNode | null = null;
  private peakListener: ((peak: number) => void) | null = null;
  private sampleRate = 44100;

  getState(): 'idle' | 'recording' {
    return this.state;
  }

  onPeak(cb: (peak: number) => void): void {
    this.peakListener = cb;
  }

  start(audioContext: AudioContext, source?: AudioNode): void {
    if (this.state === 'recording') return;

    this.sampleRate = audioContext.sampleRate || 44100;
    this.leftChunks = [];
    this.rightChunks = [];
    this.totalSamples = 0;
    this.state = 'recording';

    const bufferSize = 4096;
    const processor = audioContext.createScriptProcessor(bufferSize, 2, 2);
    this.processorNode = processor;

    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (this.state !== 'recording') return;
      const inputL = e.inputBuffer.getChannelData(0);
      const inputR = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : inputL;

      const chunkL = new Float32Array(inputL);
      const chunkR = new Float32Array(inputR);
      this.leftChunks.push(chunkL);
      this.rightChunks.push(chunkR);
      this.totalSamples += chunkL.length;

      if (this.peakListener) {
        let maxPeak = 0;
        for (let i = 0; i < chunkL.length; i += 32) {
          const v = Math.max(Math.abs(chunkL[i]), Math.abs(chunkR[i]));
          if (v > maxPeak) maxPeak = v;
        }
        this.peakListener(maxPeak);
      }
    };

    const src = source || audioContext.destination;
    this.sourceNode = src;
    if (src && typeof (src as any).connect === 'function') {
      try {
        src.connect(processor);
      } catch {
        // destination node or node without outputs might throw
      }
    }
    if (processor && typeof processor.connect === 'function' && audioContext.destination) {
      try {
        processor.connect(audioContext.destination);
      } catch {
        // ignore connect errors
      }
    }
  }

  async stop(): Promise<RecordResult> {
    this.state = 'idle';
    if (this.processorNode) {
      if (this.sourceNode && typeof (this.sourceNode as any).disconnect === 'function') {
        try {
          this.sourceNode.disconnect(this.processorNode);
        } catch {
          // ignore disconnect errors
        }
      }
      if (typeof this.processorNode.disconnect === 'function') {
        try {
          this.processorNode.disconnect();
        } catch {
          // ignore disconnect errors
        }
      }
      this.processorNode = null;
      this.sourceNode = null;
    }

    const flatL = new Float32Array(this.totalSamples);
    const flatR = new Float32Array(this.totalSamples);
    let offset = 0;
    for (let i = 0; i < this.leftChunks.length; i++) {
      flatL.set(this.leftChunks[i], offset);
      flatR.set(this.rightChunks[i], offset);
      offset += this.leftChunks[i].length;
    }

    const wavBytes = encodeWav(flatL, flatR, this.sampleRate);
    const blob = new Blob([wavBytes as unknown as BlobPart], { type: 'audio/wav' });
    const blobUrl = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(blob) : '';
    const durationSec = this.totalSamples / this.sampleRate;

    return { wavBytes, durationSec, blobUrl };
  }
}

export const audioRecorder = new AudioRecorder();
