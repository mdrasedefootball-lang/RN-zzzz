import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Languages,
  HelpCircle,
  X,
  Volume2,
  Flame,
  Info,
} from 'lucide-react';
import { AnisaOrb } from './components/AnisaOrb';
import { MicButton } from './components/MicButton';
import { StatusIndicator } from './components/StatusIndicator';
import { ActionToast } from './components/ActionToast';
import { PermissionPrompt } from './components/PermissionPrompt';
import { CharacterSelector } from './components/CharacterSelector';
import { useLiveSession } from './hooks/useLiveSession';
import { ANIME_CHARACTERS, AnimeCharacter } from './data/characters';

export default function App() {
  const [selectedCharacter, setSelectedCharacter] = useState<AnimeCharacter>(
    ANIME_CHARACTERS[0] // Ryomen Sukuna by default
  );

  const {
    state,
    connect,
    disconnect,
    interrupt,
    isConnected,
    isSpeaking,
    error,
    clearError,
    executedActions,
    getAnalysers,
  } = useLiveSession();

  const [showHelp, setShowHelp] = useState(false);

  // Handle character switching
  const handleSelectCharacter = async (newChar: AnimeCharacter) => {
    if (newChar.id === selectedCharacter.id) return;
    setSelectedCharacter(newChar);

    // If currently live, smoothly reconnect with the new character persona
    if (state === 'listening' || state === 'speaking' || state === 'connecting') {
      disconnect();
      setTimeout(() => {
        connect(newChar.id);
      }, 300);
    }
  };

  const handleStartConversation = () => {
    connect(selectedCharacter.id);
  };

  // Spacebar shortcut to trigger start or interrupt
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (state === 'speaking') {
          interrupt();
        } else if (state === 'disconnected') {
          handleStartConversation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, selectedCharacter, interrupt]);

  return (
    <div className="relative flex flex-col justify-between min-h-[100dvh] w-full max-w-md mx-auto bg-[#06070a] text-slate-100 px-4 py-4 select-none overflow-hidden transition-colors duration-500">
      {/* Dynamic Background Aura matching active character */}
      <div
        className="absolute top-[-12%] left-1/2 -translate-x-1/2 w-88 h-88 rounded-full blur-[110px] pointer-events-none transition-all duration-700 opacity-60"
        style={{ backgroundColor: selectedCharacter.themeColor.primary }}
      />
      <div
        className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[120px] pointer-events-none transition-all duration-700 opacity-40"
        style={{ backgroundColor: selectedCharacter.themeColor.secondary }}
      />

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between w-full pt-1 pb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full p-[1.5px] flex items-center justify-center shadow-lg transition-colors duration-300"
            style={{
              background: `linear-gradient(135deg, ${selectedCharacter.themeColor.primary}, ${selectedCharacter.themeColor.secondary})`,
              boxShadow: `0 0 15px ${selectedCharacter.themeColor.glow}`,
            }}
          >
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <Flame
                className="w-4 h-4 transition-colors"
                style={{ color: selectedCharacter.themeColor.accent }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-white font-display">
                {selectedCharacter.name}
              </h1>
              <span className="text-[11px] font-japanese text-slate-400">
                {selectedCharacter.japaneseName}
              </span>
            </div>
            <span
              className="text-[9px] font-mono font-semibold tracking-wider uppercase block -mt-0.5"
              style={{ color: selectedCharacter.themeColor.accent }}
            >
              {selectedCharacter.badge}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHelp(!showHelp)}
            aria-label="Character roster info"
            className="w-8 h-8 rounded-full bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Anime Character Selector Carousel */}
      <div className="relative z-10 my-1">
        <CharacterSelector
          selectedCharacter={selectedCharacter}
          onSelectCharacter={handleSelectCharacter}
          disabled={state === 'connecting'}
        />
      </div>

      {/* Multilingual Support Pill */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 py-0.5 text-[10px] font-medium text-slate-400">
        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/70 border border-slate-800/80 text-slate-300 font-mono">
          <Languages className="w-3 h-3 text-cyan-400" />
          <span>Bangla · English · Hindi · Banglish</span>
        </span>
      </div>

      {/* Central Visualizer Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center my-auto py-1">
        <div className="relative flex flex-col items-center">
          {/* Animated Real-Time Voice Visualizer with Character Avatar */}
          <AnisaOrb
            state={state}
            character={selectedCharacter}
            getAnalysers={getAnalysers}
          />

          {/* Assistant Subtitle / Current State Highlight */}
          <div className="mt-1 flex flex-col items-center text-center max-w-[280px]">
            {state === 'speaking' ? (
              <span
                className="text-xs font-semibold animate-pulse tracking-wide"
                style={{ color: selectedCharacter.themeColor.accent }}
              >
                {selectedCharacter.name} is speaking... (Tap mic to interrupt)
              </span>
            ) : state === 'listening' ? (
              <span className="text-xs text-cyan-300 font-medium">
                Listening to you...
              </span>
            ) : state === 'connecting' ? (
              <span className="text-xs text-indigo-300 animate-pulse font-medium">
                Summoning {selectedCharacter.name}...
              </span>
            ) : (
              <p className="text-[11px] text-slate-400 italic font-serif">
                "{selectedCharacter.quote}"
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Quick Character-Specific Voice Prompt Suggestions */}
      {state === 'disconnected' && (
        <div className="relative z-10 mb-3 w-full animate-in fade-in duration-300">
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider text-center mb-1.5">
            Voice Prompts for {selectedCharacter.name.split(' ')[0]}:
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {selectedCharacter.samplePrompts.map((p, i) => (
              <button
                key={i}
                onClick={handleStartConversation}
                className="px-2.5 py-1 text-[11px] rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white shadow-sm transition-colors active:scale-95"
              >
                "{p.label}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Execution Notification Banner */}
      <div className="relative z-20 mb-2 flex justify-center w-full">
        <ActionToast actions={executedActions} />
      </div>

      {/* Central Interaction Control */}
      <div className="relative z-10 flex flex-col items-center mb-3">
        <MicButton
          state={state}
          onTap={handleStartConversation}
          onInterrupt={interrupt}
          onDisconnect={disconnect}
        />
      </div>

      {/* Bottom Status Bar */}
      <footer className="relative z-10 w-full flex flex-col items-center gap-1.5 pb-0.5">
        <StatusIndicator state={state} />
      </footer>

      {/* Error / Permission Modal */}
      {error && (
        <PermissionPrompt
          message={error}
          onRetry={() => {
            clearError();
            handleStartConversation();
          }}
          onDismiss={clearError}
        />
      )}

      {/* Help / Character Roster Sheet */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-400" />
                <h3 className="font-bold text-base text-white font-display">
                  Anime Voice Characters
                </h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {ANIME_CHARACTERS.map((c) => (
                <div
                  key={c.id}
                  className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-3"
                >
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-700 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-xs">{c.name}</h4>
                      <span className="text-[10px] font-mono text-slate-400">
                        Voice: {c.voiceName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mb-1">
                      {c.title} · {c.series}
                    </span>
                    <p className="text-[11px] text-slate-300 italic font-serif leading-relaxed">
                      "{c.quote}"
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
              <p className="font-semibold text-slate-300">How it works:</p>
              <p>• Audio-to-Audio streaming using Gemini 3.1 Flash Live API.</p>
              <p>• Speak in Bangla, English, Hindi, or Banglish naturally.</p>
              <p>• Say <em>"Open YouTube"</em> to trigger the browser tool.</p>
              <p>• Tap the mic button anytime to interrupt.</p>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
