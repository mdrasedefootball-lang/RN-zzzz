import React from 'react';
import { Sparkles, Check } from 'lucide-react';
import { ANIME_CHARACTERS, AnimeCharacter } from '../data/characters';

interface CharacterSelectorProps {
  selectedCharacter: AnimeCharacter;
  onSelectCharacter: (character: AnimeCharacter) => void;
  disabled?: boolean;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  selectedCharacter,
  onSelectCharacter,
  disabled = false,
}) => {
  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400 font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          <span>Select Anime Character</span>
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          Voice: {selectedCharacter.voiceName}
        </span>
      </div>

      {/* Horizontal scrolling character roster */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth">
        {ANIME_CHARACTERS.map((char) => {
          const isSelected = selectedCharacter.id === char.id;
          return (
            <button
              key={char.id}
              disabled={disabled}
              onClick={() => onSelectCharacter(char)}
              aria-label={`Select ${char.name}`}
              className={`flex-shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-2xl border transition-all duration-300 text-left focus:outline-none ${
                isSelected
                  ? 'bg-slate-900 shadow-lg border-2 scale-[1.02]'
                  : 'bg-slate-950/70 hover:bg-slate-900/80 border-slate-800/80 opacity-70 hover:opacity-100'
              }`}
              style={{
                borderColor: isSelected ? char.themeColor.primary : undefined,
                boxShadow: isSelected ? `0 0 16px ${char.themeColor.glow}` : undefined,
              }}
            >
              {/* Character Avatar */}
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-slate-700/60 flex-shrink-0">
                <img
                  src={char.avatar}
                  alt={char.name}
                  className="w-full h-full object-cover object-center"
                />
                {isSelected && (
                  <div
                    className="absolute inset-0 bg-black/20 flex items-center justify-center"
                    style={{ backgroundColor: `${char.themeColor.primary}25` }}
                  >
                    <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                  </div>
                )}
              </div>

              {/* Character Name & Series */}
              <div className="flex flex-col min-w-0 pr-1">
                <span
                  className={`text-xs font-bold leading-tight truncate ${
                    isSelected ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {char.name}
                </span>
                <span className="text-[10px] text-slate-500 truncate leading-tight">
                  {char.series}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
