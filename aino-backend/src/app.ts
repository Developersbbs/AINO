import dotenv from 'dotenv';
dotenv.config(); // must run before any other import reads process.env

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
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
