import {
  calculateRMS,
  downsampleBuffer,
  floatTo16BitPCM,
  arrayBufferToBase64,
} from './audioUtils';

export interface AudioStreamerConfig {
  sampleRate?: number; // Target 16000
  bufferSize?: number; // ScriptProcessor bufferSize (e.g. 2048 or 4096)
  onAudioChunk?: (base64Pcm16: string) => void;
  onVolumeChange?: (rms: number) => void;
  onError?: (error: Error) => void;
}

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isStreaming = false;
  private config: AudioStreamerConfig;

  constructor(config: AudioStreamerConfig = {}) {
    this.config = {
      sampleRate: 16000,
      bufferSize: 2048,
      ...config,
    };
  }

  /**
   * Initializes microphone and starts audio streaming
   */
  public async start(): Promise<void> {
    if (this.isStreaming) return;

    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.mediaStream = stream;

      // 2. Initialize AudioContext (handle browser sample rate variations)
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      this.audioContext = new AudioContextClass();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 3. Create Audio Nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);

      // AnalyserNode for visualizer
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.sourceNode.connect(this.analyserNode);

      // ScriptProcessor for real-time PCM chunk streaming
      const bufferSize = this.config.bufferSize || 2048;
      this.processorNode = this.audioContext.createScriptProcessor(
        bufferSize,
        1,
        1
      );

      const inputSampleRate = this.audioContext.sampleRate;
      const targetSampleRate = this.config.sampleRate || 16000;

      this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!this.isStreaming) return;

        const inputChannelData = event.inputBuffer.getChannelData(0);

        // Compute volume for feedback
        const rms = calculateRMS(inputChannelData);
        if (this.config.onVolumeChange) {
          this.config.onVolumeChange(rms);
        }

        // Downsample to 16kHz if audio context runs at 44.1kHz or 48kHz
        const resampled = downsampleBuffer(
          inputChannelData,
          inputSampleRate,
          targetSampleRate
        );

        // Convert Float32 to 16-bit PCM ArrayBuffer
        const pcm16Buffer = floatTo16BitPCM(resampled);

        // Encode to base64
        const base64Chunk = arrayBufferToBase64(pcm16Buffer);

        if (this.config.onAudioChunk) {
          this.config.onAudioChunk(base64Chunk);
        }
      };

      this.sourceNode.connect(this.processorNode);
      // Connect to destination (silent or zero-gain) so onaudioprocess fires continuously
      this.processorNode.connect(this.audioContext.destination);

      this.isStreaming = true;
    } catch (err: any) {
      this.cleanup();
      const error =
        err instanceof Error ? err : new Error(err?.message || 'Microphone error');
      if (this.config.onError) {
        this.config.onError(error);
      }
      throw error;
    }
  }

  /**
   * Returns the AnalyserNode for real-time visualizer consumption
   */
  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Checks if audio is currently streaming
   */
  public getIsStreaming(): boolean {
    return this.isStreaming;
  }

  /**
   * Stops streaming and releases hardware resources
   */
  public stop(): void {
    this.cleanup();
  }

  private cleanup(): void {
    this.isStreaming = false;

    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
