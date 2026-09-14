import {
  AssistantState,
  LiveClientMessage,
  LiveServerMessage,
} from '../types/assistant';

export interface LiveSessionCallbacks {
  onStateChange: (state: AssistantState) => void;
  onAudioData: (base64Pcm24: string) => void;
  onInterrupted: () => void;
  onTurnComplete: () => void;
  onToolCall: (call: { id: string; name: string; args: Record<string, any> }) => void;
  onError: (error: Error) => void;
  onClose: (reason?: string) => void;
}

export class LiveSession {
  private socket: WebSocket | null = null;
  private state: AssistantState = 'disconnected';
  private callbacks: LiveSessionCallbacks;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private isIntentionallyClosed = false;
  private pingInterval: number | null = null;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  public getState(): AssistantState {
    return this.state;
  }

  private setState(newState: AssistantState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange(newState);
    }
  }

  private characterId = 'sukuna';

  /**
   * Connects to the server-side Gemini Live WebSocket endpoint
   */
  public async connect(characterId = 'sukuna'): Promise<void> {
    this.characterId = characterId;
    if (this.state === 'connecting' || this.state === 'listening' || this.state === 'speaking') {
      return;
    }

    this.isIntentionallyClosed = false;
    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/live?character=${encodeURIComponent(this.characterId)}`;

        const ws = new WebSocket(wsUrl);
        this.socket = ws;

        const connectionTimeout = window.setTimeout(() => {
          if (this.state === 'connecting') {
            this.setState('error');
            const err = new Error('Connection timeout to Anime Live server');
            this.callbacks.onError(err);
            this.close();
            reject(err);
          }
        }, 15000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
          this.setState('listening');
          this.startHeartbeat();
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data: LiveServerMessage = JSON.parse(event.data);
            this.handleServerMessage(data);
          } catch (err: any) {
            console.error('Failed to parse WebSocket message from server:', err);
          }
        };

        ws.onerror = (event) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', event);
          const err = new Error('Network error connecting to Anisa AI live stream');
          this.callbacks.onError(err);
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.stopHeartbeat();
          const reason = event.reason || `Code: ${event.code}`;
          
          if (!this.isIntentionallyClosed) {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              console.log(`Connection lost. Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
              setTimeout(() => {
                if (!this.isIntentionallyClosed) {
                  this.connect().catch(() => {});
                }
              }, 1500);
            } else {
              this.setState('error');
              this.callbacks.onClose(reason);
            }
          } else {
            this.setState('disconnected');
            this.callbacks.onClose(reason);
          }
        };
      } catch (err: any) {
        this.setState('error');
        const error = err instanceof Error ? err : new Error(err?.message || 'WebSocket init error');
        this.callbacks.onError(error);
        reject(error);
      }
    });
  }

  /**
   * Processes incoming server messages from Gemini Live
   */
  private handleServerMessage(message: LiveServerMessage): void {
    switch (message.type) {
      case 'ready':
        this.setState('listening');
        break;

      case 'audio':
        if (message.data) {
          this.setState('speaking');
          this.callbacks.onAudioData(message.data);
        }
        break;

      case 'interrupted':
        this.setState('listening');
        this.callbacks.onInterrupted();
        break;

      case 'turnComplete':
        // Turn ended, switch back to listening for user
        this.callbacks.onTurnComplete();
        break;

      case 'toolCall':
        if (message.toolCall?.functionCalls?.length) {
          for (const call of message.toolCall.functionCalls) {
            this.callbacks.onToolCall(call);
          }
        }
        break;

      case 'error':
        this.setState('error');
        this.callbacks.onError(new Error(message.message || 'Gemini Live Server Error'));
        break;

      case 'closed':
        this.setState('disconnected');
        this.callbacks.onClose(message.reason);
        break;
    }
  }

  /**
   * Sends captured 16kHz PCM audio to Gemini Live
   */
  public sendAudio(base64Pcm16: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const msg: LiveClientMessage = {
        type: 'audio',
        data: base64Pcm16,
      };
      this.socket.send(JSON.stringify(msg));
    }
  }

  /**
   * Sends function tool execution response back to Gemini Live
   */
  public sendToolResponse(
    id: string,
    name: string,
    output: Record<string, any>
  ): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const msg: LiveClientMessage = {
        type: 'toolResponse',
        toolResponse: {
          functionResponses: [
            {
              id,
              name,
              response: {
                output,
              },
            },
          ],
        },
      };
      this.socket.send(JSON.stringify(msg));
    }
  }

  /**
   * Sends explicit interruption signal
   */
  public interrupt(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const msg: LiveClientMessage = {
        type: 'interrupt',
      };
      this.socket.send(JSON.stringify(msg));
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Closes connection cleanly
   */
  public close(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      this.socket.onopen = null;
      if (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      ) {
        this.socket.close();
      }
      this.socket = null;
    }
    this.setState('disconnected');
  }
}
