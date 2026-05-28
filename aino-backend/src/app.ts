import dotenv from 'dotenv';
dotenv.config(); // must run before any other import reads process.env

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Build allowed-origins list from env, or fall back to reflecting any origin.
// Production: set CORS_ORIGINS=https://your-domain.com,http://localhost:3000
const corsOrigins: string[] | boolean = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : true;

const corsOptions: cors.CorsOptions = {
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Handle OPTIONS preflight before anything else so nginx/proxy errors
// on the actual request don't strip CORS headers from the preflight response.
app.options('*', cors(corsOptions));
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
