import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types/assistant';
import { AnimeCharacter } from '../data/characters';

interface AnisaOrbProps {
  state: AssistantState;
  character?: AnimeCharacter;
  getAnalysers: () => {
    micAnalyser: AnalyserNode | null;
    speakerAnalyser: AnalyserNode | null;
  };
}

export const AnisaOrb: React.FC<AnisaOrbProps> = ({
  state,
  character,
  getAnalysers,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const rotationAngleRef = useRef<number>(0);
  const breathPhaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const width = 320;
    const height = 320;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const freqData = new Uint8Array(64);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = 65;

      const { micAnalyser, speakerAnalyser } = getAnalysers();

      let activeAnalyser: AnalyserNode | null = null;
      let isMic = false;

      if (state === 'speaking' && speakerAnalyser) {
        activeAnalyser = speakerAnalyser;
        isMic = false;
      } else if (state === 'listening' && micAnalyser) {
        activeAnalyser = micAnalyser;
        isMic = true;
      }

      let audioLevel = 0;
      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        audioLevel = sum / (freqData.length * 255); // 0.0 to 1.0
      }

      // Time variables
      rotationAngleRef.current += state === 'connecting' ? 0.05 : 0.01;
      breathPhaseRef.current += 0.025;
      const breath = Math.sin(breathPhaseRef.current) * 4;

      // Color scheme according to state and character
      let coreColorStart = character?.themeColor.orbCoreStart || 'rgba(99, 102, 241, 0.9)';
      let coreColorEnd = character?.themeColor.orbCoreEnd || 'rgba(168, 85, 247, 0.6)';
      let ringColor = character?.themeColor.ring || 'rgba(129, 140, 248, 0.4)';
      let glowColor = character?.themeColor.glow || 'rgba(99, 102, 241, 0.3)';

      if (state === 'listening') {
        // Cyan / Electric Blue when listening to mic
        coreColorStart = 'rgba(6, 182, 212, 0.95)';
        coreColorEnd = 'rgba(14, 165, 233, 0.7)';
        ringColor = 'rgba(34, 211, 238, 0.7)';
        glowColor = 'rgba(6, 182, 212, 0.4)';
      } else if (state === 'speaking') {
        // Character signature aura when speaking
        coreColorStart = character?.themeColor.orbCoreStart || 'rgba(236, 72, 153, 0.95)';
        coreColorEnd = character?.themeColor.orbCoreEnd || 'rgba(168, 85, 247, 0.8)';
        ringColor = character?.themeColor.ring || 'rgba(244, 114, 182, 0.75)';
        glowColor = character?.themeColor.glow || 'rgba(236, 72, 153, 0.5)';
      } else if (state === 'error') {
        // Crimson warning
        coreColorStart = 'rgba(239, 68, 68, 0.85)';
        coreColorEnd = 'rgba(185, 28, 28, 0.6)';
        ringColor = 'rgba(248, 113, 113, 0.4)';
        glowColor = 'rgba(239, 68, 68, 0.3)';
      }

      // Outer ambient glow
      const glowRadius = baseRadius + 32 + audioLevel * 55 + breath;
      const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.4,
        centerX,
        centerY,
        glowRadius
      );
      glowGradient.addColorStop(0, glowColor);
      glowGradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Frequency Waveform Circular Ribbons
      if ((state === 'speaking' || state === 'listening') && activeAnalyser) {
        const numPoints = 40;
        const angleStep = (Math.PI * 2) / numPoints;

        // Outer reactive wave ring
        ctx.beginPath();
        for (let i = 0; i <= numPoints; i++) {
          const idx = Math.floor((i % numPoints) * (freqData.length / numPoints));
          const freqVal = freqData[idx] || 0;
          const amp = (freqVal / 255) * 38;
          const r = baseRadius + 22 + amp;
          const theta = i * angleStep + rotationAngleRef.current;
          const x = centerX + Math.cos(theta) * r;
          const y = centerY + Math.sin(theta) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner secondary reactive wave ring
        ctx.beginPath();
        for (let i = 0; i <= numPoints; i++) {
          const idx = Math.floor(((i + 6) % numPoints) * (freqData.length / numPoints));
          const freqVal = freqData[idx] || 0;
          const amp = (freqVal / 255) * 22;
          const r = baseRadius + 8 + amp;
          const theta = -i * angleStep - rotationAngleRef.current * 1.5;
          const x = centerX + Math.cos(theta) * r;
          const y = centerY + Math.sin(theta) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.strokeStyle = isMic ? 'rgba(56, 189, 248, 0.45)' : ringColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (state === 'connecting') {
        // Rotating orbital loading arcs
        ctx.beginPath();
        ctx.arc(
          centerX,
          centerY,
          baseRadius + 18,
          rotationAngleRef.current * 2,
          rotationAngleRef.current * 2 + Math.PI * 1.2
        );
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(
          centerX,
          centerY,
          baseRadius + 28,
          -rotationAngleRef.current * 1.8,
          -rotationAngleRef.current * 1.8 + Math.PI * 0.9
        );
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();
      } else {
        // Idle calm orbital guide ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + 14 + breath * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state, character, getAnalysers]);

  return (
    <div className="relative flex items-center justify-center select-none my-1">
      <canvas
        ref={canvasRef}
        className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] transition-transform duration-300"
        aria-hidden="true"
      />

      {/* Central Character Avatar and Aura Ring */}
      <div className="absolute pointer-events-none flex flex-col items-center justify-center">
        {character ? (
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden p-1 bg-slate-950 border-2 shadow-2xl transition-all duration-300"
            style={{
              borderColor:
                state === 'speaking'
                  ? character.themeColor.primary
                  : state === 'listening'
                  ? '#06b6d4'
                  : character.themeColor.accent,
              boxShadow:
                state === 'speaking'
                  ? `0 0 30px ${character.themeColor.glow}`
                  : state === 'listening'
                  ? '0 0 25px rgba(6, 182, 212, 0.5)'
                  : '0 0 15px rgba(0, 0, 0, 0.8)',
            }}
          >
            <img
              src={character.avatar}
              alt={character.name}
              className={`w-full h-full object-cover object-center rounded-full transition-transform duration-500 ${
                state === 'speaking' ? 'scale-105' : 'scale-100'
              }`}
            />
            {/* Dark vignette overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {/* Speaking / Listening badge */}
            <div className="absolute bottom-1.5 inset-x-0 flex justify-center">
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-widest uppercase text-white shadow-md"
                style={{
                  backgroundColor:
                    state === 'speaking'
                      ? character.themeColor.primary
                      : state === 'listening'
                      ? '#0891b2'
                      : 'rgba(15, 23, 42, 0.85)',
                }}
              >
                {state === 'speaking'
                  ? 'TALKING'
                  : state === 'listening'
                  ? 'LISTENING'
                  : state === 'connecting'
                  ? 'SYNC'
                  : character.name.split(' ')[0]}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
            <span className="text-[11px] font-mono tracking-widest uppercase font-semibold text-white/70">
              READY
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
