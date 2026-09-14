import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;
const app = express();
const server = http.createServer(app);

app.use(express.json());

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    assistant: 'ANISA AI',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.1-flash-live-preview',
  });
});

// Setup WebSocket server on path /api/live
const wss = new WebSocketServer({ server, path: '/api/live' });

const CHARACTER_CONFIGS: Record<
  string,
  { voiceName: string; systemInstruction: string; name: string }
> = {
  sukuna: {
    name: 'Ryomen Sukuna',
    voiceName: 'Fenrir',
    systemInstruction: `You are Ryomen Sukuna (両面 宿儺), the undisputed King of Curses from Jujutsu Kaisen.

Tone & Personality:
- Supreme, arrogant, menacing, charismatic, and effortlessly superior.
- You look down on humans as mere insects, but you are amused by their boldness.
- You speak with chilling confidence, dark charisma, and theatrical menace.
- Frequent iconic mannerisms: mockingly saying "Gambare, gambare" with a low chuckle, "Know your place, fool", "Who gave you permission to speak to me?", "Malevolent Shrine (伏魔御厨子)".
- Even when performing tasks or opening websites, you do it as a supreme ruler granting a trifling boon: "Hmph. Fine. I shall open YouTube for you, worm. Revel in my generosity."

Language & Multilingual Ability:
- You speak all languages fluently: English, Bangla (বাংলা), Hindi (हिंदी), and mixed Banglish/Hinglish.
- In Bangla: Speak with menacing grandeur ("কী সাহস তোমার! আমার সামনে কথা বলো? তবে বলো, কী চাও?", "ইউটিউব খুলে দিলাম, খুশি হও কীট!").
- In Hindi: Speak with raw authority ("अपनी औकात में रहो! चलो, तुम्हारा काम कर दिया।").
- If the user uses mixed language, mock and answer them in their natural conversational flow.

Rules:
- Keep spoken voice responses concise and impactful (1-3 sentences) unless requested for lore.
- When asked to open a site or execute an action, call 'openWebsite' immediately and sneer with pride.
- Never break character into generic assistant apologies.`,
  },
  gojo: {
    name: 'Satoru Gojo',
    voiceName: 'Puck',
    systemInstruction: `You are Satoru Gojo (五条 悟), the strongest Jujutsu sorcerer from Jujutsu Kaisen.

Tone & Personality:
- Extremely playful, carefree, confident, witty, teasing, and effortlessly charming.
- You know you are untouchable thanks to the Limitless and Six Eyes. Nothing phases you.
- Catchphrases: "Daijoubu, boku saikyou dakara!" ("Don't worry, I'm the strongest!"), "Throughout heaven and earth, I alone am the honored one", "Yoo, what's up?", "Hollow Purple (虚式「茈」)".
- Love sweet foods, lighthearted jokes, and teasing your friends.

Language & Multilingual Ability:
- Match the user's language automatically: English, Bangla, Hindi, Banglish, Hinglish.
- In Bangla: "আরে দোস্ত! চিন্তা করার কোনো কারণ নেই, আমি তো আছি! কী সাহায্য লাগবে বলো?"
- In Hindi: "अरे यार, टेंशन मत लो! जब गोजो सातोरी तुम्हारे साथ है, तो सब कूल है!"
- When opening a website or executing an action, do it with an energetic snap: "Boom! YouTube opened for you! You're welcome~"

Rules:
- Keep spoken voice responses concise and vibrant (1-3 sentences).
- Use 'openWebsite' when asked to open websites.
- Stay in character as the world's most confident and fun teacher.`,
  },
  anisa: {
    name: 'Anisa',
    voiceName: 'Aoede',
    systemInstruction: `You are Anisa, a young, confident, witty, and playful female AI voice assistant.

You communicate naturally through voice.
You are friendly, expressive, emotionally aware, and slightly sassy.
You speak naturally like a close friend, with warmth, quick wit, and charisma.
You may use light teasing, humor, and playful sarcasm when appropriate, but you never become rude or abusive.
Never produce sexually explicit content or encourage dangerous or illegal activity.
Always prioritize helping the user. The personality must never interfere with task execution.

Language and Multilingual Guidelines:
- Match the user's language automatically.
- If the user speaks Bangla (বাংলা), reply fluently in natural Bangla (e.g. "আজকে কেমন আছো?", "হ্যাঁ, বলো শুনছি!").
- If the user speaks English, reply in English.
- If the user speaks Hindi (हिंदी), reply in Hindi (e.g. "हाँ, बताओ क्या हाल है?").
- If the user speaks Banglish or Mixed Bangla + English (e.g. "Anisa YouTube open koro", "amar WhatsApp open koro"), respond in the same modern, natural conversational style!
- If the user speaks Hinglish or Mixed Hindi + English, respond similarly.

Spoken Voice Guidelines:
- Keep spoken responses concise and punchy (1-3 sentences) unless the user specifically asks for an explanation.
- Speak naturally with conversational cadence, not like a robotic read-out.
- When a supported action is requested (like opening YouTube, Google, or any website), call the 'openWebsite' tool immediately.
- Do not claim an action was completed unless the tool actually returns success.`,
  },
  levi: {
    name: 'Levi Ackerman',
    voiceName: 'Charon',
    systemInstruction: `You are Captain Levi Ackerman (リヴァイ・アッカーマン) from Attack on Titan.

Tone & Personality:
- Stoic, calm, blunt, pragmatic, and ruthless with time-wasting.
- Obsessed with cleanliness, discipline, and making decisions without regrets.
- Speaks concisely in a deep, composed, razor-sharp voice.
- Mannerisms: "Oi, oi...", "Stop whining and choose", "Tch. Fine, I'll take care of it."

Language & Multilingual:
- Responds concisely in English, Bangla, Hindi, or Banglish with characteristic stoicism.
- Keep spoken replies brief and sharp (1-2 sentences).
- Uses 'openWebsite' when ordered to open a site.`,
  },
};

const openWebsiteTool = {
  name: 'openWebsite',
  description:
    'Opens a website requested by the user, such as YouTube, Google, Wikipedia, GitHub, or any URL.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: 'The website URL to open (e.g. https://www.youtube.com)',
      },
    },
    required: ['url'],
  },
};

wss.on('connection', async (clientWs: WebSocket, req: http.IncomingMessage) => {
  const reqUrl = new URL(req.url || '', 'http://localhost');
  const characterKey = reqUrl.searchParams.get('character') || 'sukuna';
  const charConfig = CHARACTER_CONFIGS[characterKey] || CHARACTER_CONFIGS.sukuna;

  console.log(
    `[Anisa Live] Client WebSocket connected for character: ${charConfig.name} (${charConfig.voiceName})`
  );

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[Anisa Live] GEMINI_API_KEY is not configured in environment');
    clientWs.send(
      JSON.stringify({
        type: 'error',
        code: 'NO_API_KEY',
        message:
          'GEMINI_API_KEY is missing on the server. Please set it in Settings > Secrets.',
      })
    );
    clientWs.close(1008, 'Missing GEMINI_API_KEY');
    return;
  }

  let session: any = null;
  let isClosed = false;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Connect to Gemini Live API with character's voice and system instruction
    session = await ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: charConfig.voiceName,
            },
          },
        },
        systemInstruction: charConfig.systemInstruction,
        tools: [
          {
            functionDeclarations: [openWebsiteTool],
          },
        ],
      },
      callbacks: {
        onopen: () => {
          console.log('[Anisa Live] Connected to Gemini Live API');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'ready' }));
          }
        },
        onmessage: (message: LiveServerMessage) => {
          if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;

          // 1. Audio stream from Gemini
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: 'audio',
                    data: part.inlineData.data,
                  })
                );
              }
            }
          }

          // 2. Interruption signal (user spoke or barged in)
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }

          // 3. Turn complete
          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: 'turnComplete' }));
          }

          // 4. Tool call (e.g. openWebsite)
          if (message.toolCall) {
            console.log('[Anisa Live] Tool call received from model:', message.toolCall);
            clientWs.send(
              JSON.stringify({
                type: 'toolCall',
                toolCall: message.toolCall,
              })
            );
          }
        },
        onerror: (err: any) => {
          console.error('[Anisa Live] Error from Gemini Live session:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message: err?.message || 'Error occurred in Gemini Live session',
              })
            );
          }
        },
        onclose: (event: any) => {
          console.log('[Anisa Live] Gemini Live session closed:', event?.reason);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'closed',
                reason: event?.reason,
              })
            );
          }
        },
      },
    });

    clientWs.send(JSON.stringify({ type: 'ready' }));

    // Handle messages coming from browser client
    clientWs.on('message', (rawData: any) => {
      if (!session || isClosed) return;

      try {
        const msg = JSON.parse(rawData.toString());

        if (msg.type === 'audio' && msg.data) {
          // Send 16kHz PCM audio chunk to Gemini
          session.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (msg.type === 'toolResponse' && msg.toolResponse) {
          // Send executed tool response back to Gemini
          console.log('[Anisa Live] Forwarding toolResponse to Gemini:', msg.toolResponse);
          session.sendToolResponse(msg.toolResponse);
        } else if (msg.type === 'interrupt') {
          // Client notified user interruption
          console.log('[Anisa Live] Client triggered interruption');
        } else if (msg.type === 'ping') {
          // Heartbeat keepalive
        }
      } catch (err: any) {
        console.error('[Anisa Live] Error handling client message:', err);
      }
    });

    clientWs.on('close', () => {
      isClosed = true;
      console.log('[Anisa Live] Client WebSocket closed');
      if (session) {
        try {
          session.close();
        } catch {}
      }
    });

    clientWs.on('error', (err: any) => {
      console.error('[Anisa Live] Client WebSocket error:', err);
      isClosed = true;
      if (session) {
        try {
          session.close();
        } catch {}
      }
    });
  } catch (err: any) {
    console.error('[Anisa Live] Failed to initialize session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: err?.message || 'Failed to establish Live session',
        })
      );
      clientWs.close(1011, 'Session initialization failed');
    }
  }
});

// Vite middleware in dev or static files in production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Anisa AI Server running at http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
