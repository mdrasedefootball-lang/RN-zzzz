import React from 'react';
import { MicOff, AlertCircle, RefreshCw } from 'lucide-react';

interface PermissionPromptProps {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({
  message,
  onRetry,
  onDismiss,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm p-6 bg-slate-900 border border-red-500/30 rounded-3xl shadow-2xl shadow-red-950/40 text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 shadow-inner">
          <MicOff className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2">Microphone Access Required</h3>

        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          {message}
        </p>

        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-left text-[11px] text-slate-400 mb-5 w-full space-y-1">
          <p className="font-semibold text-slate-300">How to fix:</p>
          <p>1. Tap the lock/tune icon near your browser URL bar.</p>
          <p>2. Set Microphone permission to <strong>Allow</strong>.</p>
          <p>3. Tap <strong>Retry Connection</strong> below.</p>
        </div>

        <div className="flex items-center gap-2.5 w-full">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={onRetry}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    </div>
  );
};
