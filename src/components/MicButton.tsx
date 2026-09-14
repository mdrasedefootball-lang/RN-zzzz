import React from 'react';
import { Mic, MicOff, Volume2, AlertCircle, Loader2, Square } from 'lucide-react';
import { AssistantState } from '../types/assistant';

interface MicButtonProps {
  state: AssistantState;
  onTap: () => void;
  onInterrupt: () => void;
  onDisconnect: () => void;
}

export const MicButton: React.FC<MicButtonProps> = ({
  state,
  onTap,
  onInterrupt,
  onDisconnect,
}) => {
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isConnecting = state === 'connecting';
  const isError = state === 'error';
  const isIdle = state === 'disconnected';

  const handleClick = () => {
    if (isSpeaking) {
      // Tap while speaking -> interrupt immediately!
      onInterrupt();
    } else if (isListening) {
      // Tap while listening -> end session or toggle
      onDisconnect();
    } else if (isConnecting) {
      onDisconnect();
    } else {
      // Disconnected or Error -> Start Anisa
      onTap();
    }
  };

  const getAriaLabel = () => {
    switch (state) {
      case 'speaking':
        return 'Interrupt Anisa';
      case 'listening':
        return 'Stop listening';
      case 'connecting':
        return 'Connecting to Anisa';
      case 'error':
        return 'Retry Anisa';
      default:
        return 'Start Anisa Voice Assistant';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'speaking':
        return 'Tap to interrupt';
      case 'listening':
        return 'Listening...';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Tap to retry';
      default:
        return 'Tap to speak';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Outer Glow Ring Container */}
      <div className="relative flex items-center justify-center">
        {/* Animated pulse rings for Listening state */}
        {isListening && (
          <>
            <div className="absolute w-24 h-24 rounded-full border border-cyan-400/40 animate-ping duration-1000 pointer-events-none" />
            <div className="absolute w-28 h-28 rounded-full bg-cyan-500/15 blur-md pointer-events-none animate-pulse" />
          </>
        )}

        {/* Animated glow for Speaking state */}
        {isSpeaking && (
          <>
            <div className="absolute w-28 h-28 rounded-full bg-fuchsia-500/25 blur-lg pointer-events-none animate-pulse duration-700" />
            <div className="absolute w-24 h-24 rounded-full border border-pink-400/50 pointer-events-none animate-spin" style={{ animationDuration: '3s' }} />
          </>
        )}

        {/* Connecting Ring */}
        {isConnecting && (
          <div className="absolute w-24 h-24 rounded-full border-2 border-indigo-400/20 border-t-indigo-400 animate-spin pointer-events-none" />
        )}

        {/* Main Central Button */}
        <button
          id="anisa-central-mic-btn"
          onClick={handleClick}
          aria-label={getAriaLabel()}
          className={`relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl focus:outline-none focus:ring-4 active:scale-95 ${
            isSpeaking
              ? 'bg-gradient-to-tr from-pink-600 via-rose-500 to-purple-600 text-white shadow-pink-500/40 focus:ring-pink-500/50'
              : isListening
              ? 'bg-gradient-to-tr from-cyan-600 via-teal-500 to-sky-500 text-white shadow-cyan-500/40 focus:ring-cyan-400/50'
              : isConnecting
              ? 'bg-slate-800 text-indigo-300 border border-indigo-500/30 focus:ring-indigo-500/30'
              : isError
              ? 'bg-gradient-to-tr from-red-600 to-rose-700 text-white shadow-red-500/30 focus:ring-red-500/50'
              : 'bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 text-cyan-400 hover:border-cyan-500/60 shadow-black/60 focus:ring-cyan-500/30'
          }`}
        >
          {isSpeaking ? (
            <div className="flex flex-col items-center">
              <Volume2 className="w-8 h-8 animate-pulse" />
              <span className="text-[10px] font-medium tracking-tight mt-0.5 opacity-90">STOP</span>
            </div>
          ) : isListening ? (
            <Mic className="w-8 h-8 animate-pulse text-white drop-shadow" />
          ) : isConnecting ? (
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          ) : isError ? (
            <AlertCircle className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 transition-transform group-hover:scale-110 text-cyan-300" />
          )}
        </button>
      </div>

      {/* State Caption */}
      <div className="flex flex-col items-center text-center">
        <span
          id="anisa-state-label"
          className={`text-sm font-semibold tracking-wide transition-colors ${
            isSpeaking
              ? 'text-pink-300'
              : isListening
              ? 'text-cyan-300'
              : isConnecting
              ? 'text-indigo-300'
              : isError
              ? 'text-red-400'
              : 'text-slate-400'
          }`}
        >
          {getStatusText()}
        </span>

        {isListening && (
          <span className="text-[11px] text-slate-500 tracking-wider">
            Speak naturally in Bangla, English or Hindi
          </span>
        )}
      </div>
    </div>
  );
};
