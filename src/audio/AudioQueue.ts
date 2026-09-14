export interface QueueItem {
  id: string;
  audioBuffer: AudioBuffer;
  duration: number;
}

export class AudioQueue {
  private queue: QueueItem[] = [];

  public enqueue(item: QueueItem): void {
    this.queue.push(item);
  }

  public dequeue(): QueueItem | undefined {
    return this.queue.shift();
  }

  public peek(): QueueItem | undefined {
    return this.queue[0];
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public size(): number {
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
  }
}
