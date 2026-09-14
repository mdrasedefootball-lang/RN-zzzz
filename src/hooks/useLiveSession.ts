import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioPlayer } from '../audio/AudioPlayer';
import { AudioStreamer } from '../audio/AudioStreamer';
import { LiveSession } from '../gemini/LiveSession';
import { executeToolCall } from '../gemini/tools';
import { AssistantState, ExecutedAction } from '../types/assistant';

export interface UseLiveSessionReturn {
  state: AssistantState;
  connect: (charId?: string) => Promise<void>;
  disconnect: () => void;
  interrupt: () => void;
  isConnected: boolean;
  isSpeaking: boolean;
  error: string | null;
  clearError: () => void;
  executedActions: ExecutedAction[];
  clearActions: () => void;
  getAnalysers: () => {
    micAnalyser: AnalyserNode | null;
    speakerAnalyser: AnalyserNode | null;
  };
}

export function useLiveSession(): UseLiveSessionReturn {
  const [state, setState] = useState<AssistantState>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [executedActions, setExecutedActions] = useState<ExecutedAction[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // References to long-lived audio and session resources
  const sessionRef = useRef<LiveSession | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const isConnectingRef = useRef(false);

  // Keep state in a ref to avoid stale closures in callbacks
  const stateRef = useRef<AssistantState>('disconnected');
  stateRef.current = state;

  /**
   * Interrupts playback and resets to listening
   */
  const interrupt = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.interruptPlayback();
    }
    if (sessionRef.current) {
      sessionRef.current.interrupt();
    }
    setIsSpeaking(false);
    if (stateRef.current === 'speaking') {
      setState('listening');
    }
  }, []);

  /**
   * Cleanly disconnects all sessions and audio hardware
   */
  const disconnect = useCallback(() => {
    isConnectingRef.current = false;
    if (playerRef.current) {
      playerRef.current.close();
      playerRef.current = null;
    }
    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsSpeaking(false);
    setState('disconnected');
  }, []);

  /**
   * Initiates the microphone and connects to Gemini Live
   */
  const connect = useCallback(async (charId?: string) => {
    if (isConnectingRef.current || stateRef.current === 'connecting' || stateRef.current === 'listening' || stateRef.current === 'speaking') {
      return;
    }

    isConnectingRef.current = true;
    setError(null);
    setState('connecting');

    try {
      // 1. Initialize AudioPlayer (24kHz output)
      const player = new AudioPlayer({
        sampleRate: 24000,
        onSpeakingStateChange: (speaking) => {
          setIsSpeaking(speaking);
          if (speaking) {
            setState('speaking');
          } else if (stateRef.current === 'speaking') {
            setState('listening');
          }
        },
        onError: (err) => {
          console.error('AudioPlayer error:', err);
        },
      });
      await player.init();
      playerRef.current = player;

      // 2. Initialize AudioStreamer (16kHz microphone capture)
      const streamer = new AudioStreamer({
        sampleRate: 16000,
        onAudioChunk: (base64Chunk) => {
          if (sessionRef.current && sessionRef.current.getState() !== 'disconnected') {
            sessionRef.current.sendAudio(base64Chunk);
          }
        },
        onError: (err) => {
          console.error('AudioStreamer error:', err);
          setError(
            err.name === 'NotAllowedError'
              ? 'Microphone permission denied. Please grant microphone access in your browser settings.'
              : `Microphone error: ${err.message}`
          );
          disconnect();
        },
      });

      // 3. Initialize LiveSession
      const session = new LiveSession({
        onStateChange: (newState) => {
          setState(newState);
        },
        onAudioData: (base64Pcm24) => {
          if (playerRef.current) {
            playerRef.current.playChunk(base64Pcm24);
          }
        },
        onInterrupted: () => {
          if (playerRef.current) {
            playerRef.current.interruptPlayback();
          }
          setIsSpeaking(false);
          setState('listening');
        },
        onTurnComplete: () => {
          // Model turn completed, check if player has finished or is still speaking
          if (!playerRef.current?.getIsPlaying()) {
            setState('listening');
          }
        },
        onToolCall: async (call) => {
          const actionId = `${call.id}-${Date.now()}`;
          try {
            const result = await executeToolCall(call.name, call.args);

            const newAction: ExecutedAction = {
              id: actionId,
              tool: call.name,
              summary: result.message,
              timestamp: Date.now(),
              success: result.success,
              url: result.data?.url,
            };

            setExecutedActions((prev) => [newAction, ...prev.slice(0, 9)]);

            // Return response immediately to Gemini Live
            session.sendToolResponse(call.id, call.name, {
              success: result.success,
              message: result.message,
              ...(result.data || {}),
            });
          } catch (err: any) {
            console.error('Failed to execute tool call:', err);
            session.sendToolResponse(call.id, call.name, {
              success: false,
              message: err?.message || 'Tool execution failed',
            });
          }
        },
        onError: (err) => {
          console.error('LiveSession error:', err);
          setError(err.message || 'Live session encountered an error');
          setState('error');
        },
        onClose: () => {
          disconnect();
        },
      });

      sessionRef.current = session;

      // 4. Connect WebSocket first with selected character
      await session.connect(charId || 'sukuna');

      // 5. Start microphone stream after session is established
      await streamer.start();
      streamerRef.current = streamer;

      isConnectingRef.current = false;
      setState('listening');
    } catch (err: any) {
      console.error('Failed to start Live session:', err);
      isConnectingRef.current = false;
      const isMicError = err?.name === 'NotAllowedError' || err?.message?.includes('Permission');
      setError(
        isMicError
          ? 'Microphone permission denied. Settings থেকে microphone permission অন করে আবার চেষ্টা করুন।'
          : err?.message || 'Failed to connect to Anisa AI voice server.'
      );
      disconnect();
    }
  }, [disconnect]);

  // Clean up all resources when component unmounts
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearActions = useCallback(() => {
    setExecutedActions([]);
  }, []);

  const getAnalysers = useCallback(() => {
    return {
      micAnalyser: streamerRef.current?.getAnalyser() || null,
      speakerAnalyser: playerRef.current?.getAnalyser() || null,
    };
  }, []);

  return {
    state,
    connect,
    disconnect,
    interrupt,
    isConnected: state === 'listening' || state === 'speaking',
    isSpeaking,
    error,
    clearError,
    executedActions,
    clearActions,
    getAnalysers,
  };
}
