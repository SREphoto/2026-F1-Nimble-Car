/**
 * server/index.js — Zero-dependency Local Gemini Flash Audio & TTS Server for F1 Nimble Car
 * Uses native Node.js (http, fs, fetch) with no external npm packages required.
 * SREdesigns - Samuel R Erwin III
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple native .env loader
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf-8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx > 0) {
            const key = trimmed.slice(0, idx).trim();
            const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) process.env[key] = val;
          }
        }
      });
    }
  }
}
loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const CACHE_DIR = path.join(__dirname, '..', 'assets', 'audio', 'generated');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Call Gemini Flash with Audio output modality (tries 2.5-flash then 2.0-flash)
 */
async function callGeminiAudio(text, voiceName = 'Puck') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in server .env');
  }

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
  let lastErr = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status} (${model}): ${errText}`);
      }

      const json = await response.json();
      const part = json?.candidates?.[0]?.content?.parts?.[0];
      const inlineData = part?.inlineData;

      if (!inlineData?.data) {
        throw new Error(`Gemini response from ${model} did not contain audio inlineData`);
      }

      return {
        mimeType: inlineData.mimeType || 'audio/wav',
        buffer: Buffer.from(inlineData.data, 'base64'),
      };
    } catch (err) {
      lastErr = err;
      console.warn(`[callGeminiAudio] Model ${model} attempt failed:`, err.message);
    }
  }

  throw lastErr || new Error('All Gemini audio models failed');
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Serve static generated audio files
  if (pathname.startsWith('/audio/generated/')) {
    const fileName = path.basename(pathname);
    const filePath = path.join(CACHE_DIR, fileName);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Access-Control-Allow-Origin': '*',
      });
      return fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
      return res.end('Audio file not found');
    }
  }

  // Health check
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      hasApiKey: !!GEMINI_API_KEY,
      geminiModel: 'gemini-2.5-flash',
      cacheDir: CACHE_DIR,
    });
  }

  // Helper to read request body
  const readBody = () =>
    new Promise((resolve) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}'));
        } catch {
          resolve({});
        }
      });
    });

  // POST /api/tts
  if (pathname === '/api/tts' && req.method === 'POST') {
    const body = await readBody();
    const { text, role = 'announcer', voice } = body;
    if (!text) return sendJson(res, 400, { error: 'text is required' });

    const selectedVoice = voice || (role === 'engineer' ? 'Charon' : 'Fenrir');
    const cacheKey = `${role}_${Buffer.from(text).toString('hex').slice(0, 16)}.wav`;
    const cachePath = path.join(CACHE_DIR, cacheKey);

    if (fs.existsSync(cachePath)) {
      return sendJson(res, 200, {
        success: true,
        cached: true,
        audioUrl: `/audio/generated/${cacheKey}`,
        role,
        text,
      });
    }

    if (!GEMINI_API_KEY) {
      return sendJson(res, 200, {
        success: false,
        fallback: true,
        message: 'No GEMINI_API_KEY configured. Fall back to client Web Speech.',
        text,
        role,
      });
    }

    try {
      const audio = await callGeminiAudio(text, selectedVoice);
      fs.writeFileSync(cachePath, audio.buffer);
      return sendJson(res, 200, {
        success: true,
        cached: false,
        audioUrl: `/audio/generated/${cacheKey}`,
        role,
        text,
      });
    } catch (err) {
      console.error('[TTS Error]', err.message);
      return sendJson(res, 500, {
        error: err.message,
        fallback: true,
        text,
        role,
      });
    }
  }

  // POST /api/session-audio-pack
  if (pathname === '/api/session-audio-pack' && req.method === 'POST') {
    const body = await readBody();
    const { sessionType = 'race' } = body;

    const lines = [
      { key: 'race_start', role: 'announcer', voice: 'Fenrir', text: 'And it is lights out and away we go for the Austrian Grand Prix!' },
      { key: 'box_this_lap', role: 'engineer', voice: 'Charon', text: 'Box this lap, box, box. Confirm.' },
      { key: 'yellow_flag', role: 'engineer', voice: 'Charon', text: 'Yellow flag ahead in Sector 2. Hold your position.' },
      { key: 'push_now', role: 'engineer', voice: 'Charon', text: 'Gap ahead is closing, DRS available. Push now.' },
      { key: 'great_overtake', role: 'announcer', voice: 'Fenrir', text: 'Sensational dive down the inside! A brilliant overtake!' },
      { key: 'final_lap', role: 'announcer', voice: 'Fenrir', text: 'Onto the final lap at Spielberg! One lap remaining!' },
      { key: 'chequered_flag', role: 'announcer', voice: 'Fenrir', text: 'What an extraordinary drive! They take the chequered flag!' },
    ];

    const results = {};
    for (const item of lines) {
      const filename = `${sessionType}_${item.key}.wav`;
      const filePath = path.join(CACHE_DIR, filename);

      if (fs.existsSync(filePath)) {
        results[item.key] = { audioUrl: `/audio/generated/${filename}`, ...item };
        continue;
      }

      if (GEMINI_API_KEY) {
        try {
          const audio = await callGeminiAudio(item.text, item.voice);
          fs.writeFileSync(filePath, audio.buffer);
          results[item.key] = { audioUrl: `/audio/generated/${filename}`, ...item };
        } catch (e) {
          console.warn(`Failed to pre-compile ${item.key}:`, e.message);
          results[item.key] = { fallback: true, ...item };
        }
      } else {
        results[item.key] = { fallback: true, ...item };
      }
    }

    return sendJson(res, 200, {
      success: true,
      sessionType,
      pack: results,
    });
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.info(`[F1 Audio Server] Running on http://localhost:${PORT}`);
  console.info(`[F1 Audio Server] Gemini API Key present: ${!!GEMINI_API_KEY}`);
});
