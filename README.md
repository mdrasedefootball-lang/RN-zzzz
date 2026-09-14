# Anisa AI — Production-Ready Real-Time Voice-to-Voice AI Assistant

**Anisa** is a young, confident, witty, and playful female AI voice assistant built with React, TypeScript, Vite, Tailwind CSS, `@google/genai`, and the Gemini Live API (`gemini-3.1-flash-live-preview`).

## Core Architecture

Anisa uses a strict **Audio-to-Audio** pipeline. No text-generation stubs, no fake browser TTS, and no text-chat bubbles.

```
Microphone (Browser)
   ↓
AudioContext (Web Audio API)
   ↓
Downsampling & Conversion → PCM16 / 16,000 Hz Mono
   ↓
WebSocket Client (/api/live)
   ↓
Express Backend + @google/genai ai.live.connect
   ↓
Gemini 3.1 Flash Live Preview
   ↓
Streaming 24kHz PCM Audio
   ↓
AudioPlayer & AudioQueue (Web Audio API)
   ↓
Speaker
```

### Barge-In & Instant Interruption
- Users can interrupt Anisa naturally by speaking or tapping the central microphone button.
- When an interruption occurs:
  1. `interruptPlayback()` stops all active Web Audio `AudioBufferSourceNode` instances instantly.
  2. Queued audio chunks are wiped.
  3. The playback timer and next-start offset are reset.
  4. The assistant immediately transitions to `listening` mode.

### Visualizer (AnalyserNode)
- Uses `requestAnimationFrame` and high-DPI HTML5 Canvas.
- Feeds off real-time frequency data from Web Audio `AnalyserNode`:
  - **Listening**: Pulses dynamically with user's microphone amplitude and frequencies.
  - **Speaking**: Visualizes Anisa's streaming voice frequencies and harmonics.
  - **Idle**: Gentle breathing orbital animation.
  - **Connecting**: Smooth rotating orbital rings.

### Function Calling (Browser Tools)
- **`openWebsite({ url: string })`**:
  - Safe protocol validation (strictly allows `https://` / `http://`, blocks `javascript:`, `data:`, `file:`, etc.).
  - Executes `window.open(url, '_blank')`.
  - Returns tool execution response back to Gemini Live in real-time.

### Multilingual Support
- **Bangla (বাংলা)**: e.g. "আজকে কেমন আছো?"
- **English**: e.g. "What's the weather today?"
- **Hindi (हिंदी)**: e.g. "Anisa, YouTube kholo"
- **Banglish & Mixed**: e.g. "Anisa, amar YouTube open koro"

## Environment Setup

Add your Gemini API key:
```bash
# In .env or AI Studio Settings > Secrets
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
```

## Running the Application

```bash
# Development
npm run dev

# Production Build
npm run build

# Start Production Server
npm start
```
