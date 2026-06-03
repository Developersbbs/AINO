import dotenv from 'dotenv';
dotenv.config(); // must run before any other import reads process.env

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

const allowedOrigins = new Set<string>(
  process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()) : [],
);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // No origin = same-origin or non-browser client (mobile native, Postman) — allow
    if (!origin) return callback(null, true);
    // Always allow localhost / 127.0.0.1 for local development
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    // Allow if explicitly listed, or if no list was configured (open)
    if (allowedOrigins.size === 0 || allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Handle OPTIONS preflight before anything else so nginx/proxy errors
// on the actual request don't strip CORS headers from the preflight response.
app.options(/.*/, cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));

// Static file serving — layout images uploaded via POST /:id/layout
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Customer-facing plot booking page served at /book/:shareToken
app.get('/book/:shareToken', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'book.html'));
});

// Routes
app.use('/api', routes);

// Base route
app.get('/', (_req, res) => {
  res.send('AINO Real Estate Platform API');
});

app.use(errorHandler);

export default app;
