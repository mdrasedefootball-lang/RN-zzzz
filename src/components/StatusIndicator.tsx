import React from 'react';
import { Sparkles, Radio, WifiOff, Disc, Volume2 } from 'lucide-react';
import { AssistantState } from '../types/assistant';

interface StatusIndicatorProps {
  state: AssistantState;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ state }) => {
  return (
    <div className="flex items-center justify-between w-full max-w-sm px-4 py-2 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-full text-xs text-slate-400">
      {/* State Status Pill */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {state === 'listening' && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </>
          )}
          {state === 'speaking' && (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
            </>
          )}
          {state === 'connecting' && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 animate-pulse"></span>
          )}
          {state === 'error' && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          )}
          {state === 'disconnected' && (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
          )}
        </span>

        <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-slate-300">
          {state === 'speaking'
            ? 'Speaking'
            : state === 'listening'
            ? 'Live Stream'
            : state === 'connecting'
            ? 'Connecting'
            : state === 'error'
            ? 'Error'
            : 'Standby'}
        </span>
      </div>

      {/* Model & Audio Mode Badges */}
      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/50 text-slate-400">
          16kHz → 24kHz
        </span>
        <span className="px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
          Gemini Live
        </span>
      </div>
    </div>
  );
};
