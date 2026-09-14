import { AudioQueue } from './AudioQueue';
import { base64ToArrayBuffer, pcm16ToAudioBuffer } from './audioUtils';

export interface AudioPlayerConfig {
  sampleRate?: number; // 24000 Hz for Gemini Live output
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  onVolumeChange?: (volume: number) => void;
  onError?: (error: Error) => void;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private queue = new AudioQueue();
  private nextStartTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isPlaying = false;
  private config: AudioPlayerConfig;
  private endCheckTimer: number | null = null;

  constructor(config: AudioPlayerConfig = {}) {
    this.config = {
      sampleRate: 24000,
      ...config,
    };
  }

  /**
   * Initializes the AudioContext for playback
   */
  public async init(): Promise<void> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      this.audioContext = new AudioContextClass({
        sampleRate: this.config.sampleRate || 24000,
      });

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Returns the output AnalyserNode for visualizer
   */
  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Receives a base64 encoded 24kHz PCM chunk from Gemini Live
   * and schedules it for seamless, gapless playback
   */
  public async playChunk(base64Chunk: string): Promise<void> {
    try {
      await this.init();
      if (!this.audioContext || !this.gainNode) return;

      const pcmBuffer = base64ToArrayBuffer(base64Chunk);
      if (pcmBuffer.byteLength === 0) return;

      const audioBuffer = pcm16ToAudioBuffer(
        pcmBuffer,
        this.audioContext,
        this.config.sampleRate || 24000
      );

      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.gainNode);

      const currentTime = this.audioContext.currentTime;
      // If nextStartTime is in the past, reset to currentTime
      const startTime = Math.max(currentTime, this.nextStartTime);
      sourceNode.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSources.add(sourceNode);
      this.setSpeaking(true);

      sourceNode.onended = () => {
        this.activeSources.delete(sourceNode);
        sourceNode.disconnect();
        this.checkPlaybackEnded();
      };

      this.scheduleEndCheck();
    } catch (err: any) {
      const error =
        err instanceof Error ? err : new Error(err?.message || 'Audio decode error');
      if (this.config.onError) {
        this.config.onError(error);
      }
    }
  }

  /**
   * Immediately stops all currently playing and queued audio (Barge-in / Interruption)
   */
  public interruptPlayback(): void {
    // 1. Stop all active buffer sources
    this.activeSources.forEach((source) => {
      try {
        source.stop(0);
        source.disconnect();
      } catch {
        // Node may already have stopped
      }
    });
    this.activeSources.clear();

    // 2. Clear queued audio chunks
    this.queue.clear();

    // 3. Reset playback timing
    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    } else {
      this.nextStartTime = 0;
    }

    if (this.endCheckTimer) {
      window.clearTimeout(this.endCheckTimer);
      this.endCheckTimer = null;
    }

    // 4. Update speaking state
    this.setSpeaking(false);
  }

  /**
   * Resets playback state
   */
  public resetPlaybackState(): void {
    this.interruptPlayback();
  }

  /**
   * Sets speaking state and fires callbacks
   */
  private setSpeaking(speaking: boolean): void {
    if (this.isPlaying !== speaking) {
      this.isPlaying = speaking;
      if (this.config.onSpeakingStateChange) {
        this.config.onSpeakingStateChange(speaking);
      }
    }
  }

  /**
   * Checks if audio playback has finished
   */
  private checkPlaybackEnded(): void {
    if (!this.audioContext) return;
    const isFinished =
      this.activeSources.size === 0 &&
      this.audioContext.currentTime >= this.nextStartTime - 0.05;

    if (isFinished) {
      this.setSpeaking(false);
    }
  }

  /**
   * Fallback timer to ensure speaking state turns off when audio finishes
   */
  private scheduleEndCheck(): void {
    if (this.endCheckTimer) {
      window.clearTimeout(this.endCheckTimer);
    }

    if (!this.audioContext) return;
    const remainingTime = Math.max(
      0,
      (this.nextStartTime - this.audioContext.currentTime) * 1000
    );

    this.endCheckTimer = window.setTimeout(() => {
      this.checkPlaybackEnded();
    }, remainingTime + 80);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public close(): void {
    this.interruptPlayback();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }
}
