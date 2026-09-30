import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { corsOptions } from './config/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import apiRouter from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const FRONTEND   = join(__dirname, '..', 'frontend');

const app = express();

// ── Security & logging middleware ─────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disabled so ES modules load in browser
}));
app.use(cors(corsOptions));
app.use(morgan('dev'));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API routes ────────────────────────────────────────────────
app.use('/api', apiRouter);

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve frontend static files ───────────────────────────────
app.use(express.static(FRONTEND));

// ── SPA fallback — serve login.html for unknown routes ────────
app.get('*', (_req, res) => {
  res.sendFile(join(FRONTEND, 'login.html'));
});

// ── Error handling (must be after routes) ─────────────────────
app.use(errorHandler);

export default app;
