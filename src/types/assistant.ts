export type AssistantState =
  | 'disconnected'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'error';

export interface ToolCallPayload {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolResponsePayload {
  id: string;
  name: string;
  response: {
    output: Record<string, any>;
  };
}

export interface ExecutedAction {
  id: string;
  tool: string;
  summary: string;
  timestamp: number;
  success: boolean;
  url?: string;
}

export type LiveClientMessage =
  | { type: 'audio'; data: string } // base64 PCM 16kHz
  | { type: 'interrupt' }
  | { type: 'toolResponse'; toolResponse: { functionResponses: Array<{ id: string; name: string; response: { output: Record<string, any> } }> } }
  | { type: 'ping' };

export type LiveServerMessage =
  | { type: 'ready' }
  | { type: 'audio'; data: string } // base64 PCM 24kHz
  | { type: 'interrupted' }
  | { type: 'turnComplete' }
  | { type: 'toolCall'; toolCall: { functionCalls: Array<{ id: string; name: string; args: Record<string, any> }> } }
  | { type: 'error'; message: string; code?: string }
  | { type: 'closed'; reason?: string };

export interface AudioVisualizerData {
  micFrequencyData: Uint8Array;
  speakerFrequencyData: Uint8Array;
  micVolume: number;
  speakerVolume: number;
}
