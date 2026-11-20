import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { interpretWithGemini } from './server/geminiPlanner';
import { loadProjectBundle } from './server/projectManifest';
import { SlidingWindowRateLimiter, validateInterpretBody } from './server/rateLimiter';

const PORT = 3000;
const SESSION_TTL_MS = 15 * 60 * 1000;
const sessionTokens = new Map<string, number>();
const rateLimiter = new SlidingWindowRateLimiter(30, 60 * 1000);

function issueSessionToken(): { token: string; expiresAtEpochMs: number } {
  const now = Date.now();
  for (const [tok, exp] of sessionTokens.entries()) {
    if (exp <= now) sessionTokens.delete(tok);
  }
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAtEpochMs = now + SESSION_TTL_MS;
  sessionTokens.set(token, expiresAtEpochMs);
  return { token, expiresAtEpochMs };
}

function requireBearerAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    res.status(401).json({ error: 'Missing Bearer authentication token.' });
    return;
  }
  const token = match[1].trim();
  const staticToken = process.env.SIFAT_CLIENT_TOKEN?.trim();
  if (staticToken && staticToken !== 'CHANGE_ME_BEFORE_PRODUCTION' && token === staticToken) {
    next();
    return;
  }
  const expiry = sessionTokens.get(token);
  if (!expiry || expiry <= Date.now()) {
    sessionTokens.delete(token);
    res.status(401).json({ error: 'Session token expired or invalid. Request a new session.' });
    return;
  }
  next();
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    const keyConfigured =
      Boolean(process.env.GEMINI_API_KEY) && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
    res.json({
      status: 'ok',
      service: 'sifat-agent-backend',
      geminiConfigured: keyConfigured,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/auth/session', (req, res) => {
    const clientKey = req.ip || 'unknown';
    const rl = rateLimiter.check(`auth:${clientKey}`);
    if (!rl.allowed) {
      res.status(429).json({ error: 'Too many session requests. Please try again shortly.' });
      return;
    }
    const session = issueSessionToken();
    res.json(session);
  });

  app.post('/api/agent/interpret', requireBearerAuth, async (req, res) => {
    const clientKey = req.ip || req.header('authorization') || 'unknown';
    const rl = rateLimiter.check(`interpret:${clientKey}`);
    res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
    if (!rl.allowed) {
      res.status(429).json({ error: 'Rate limit exceeded. Please pause briefly before sending more commands.' });
      return;
    }

    const validation = validateInterpretBody(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    try {
      const result = await interpretWithGemini(validation.data);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected Gemini backend error.';
      const status = message.includes('GEMINI_API_KEY') ? 503 : 502;
      res.status(status).json({ error: message });
    }
  });

  app.get('/api/android-project', (_req, res) => {
    try {
      const files = loadProjectBundle(process.cwd());
      res.json({
        projectName: 'Sifat Agent',
        packageName: 'com.sifatagent.app',
        minSdk: 26,
        targetSdk: 35,
        files,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load Android project files.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sifat Agent server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
