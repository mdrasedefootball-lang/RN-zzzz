import React from 'react';
import { ExternalLink, CheckCircle2, XCircle, Globe } from 'lucide-react';
import { ExecutedAction } from '../types/assistant';

interface ActionToastProps {
  actions: ExecutedAction[];
  onDismiss?: (id: string) => void;
}

export const ActionToast: React.FC<ActionToastProps> = ({ actions }) => {
  if (actions.length === 0) return null;

  const latestAction = actions[0];

  return (
    <div className="w-full max-w-sm px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-3 bg-slate-900/90 backdrop-blur-lg border border-cyan-500/30 rounded-2xl shadow-lg shadow-black/50 text-xs">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono font-medium">
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">Tool Executed: {latestAction.tool}</span>
          </div>
          {latestAction.success ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
          )}
        </div>

        <p className="text-slate-300 text-[12px] leading-relaxed">
          {latestAction.summary}
        </p>

        {latestAction.url && (
          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
              {latestAction.url}
            </span>
            <a
              href={latestAction.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 text-[11px] font-medium transition-colors"
            >
              Open <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
