import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { menuRouter } from './routes/menu.js';
import { env } from './config/env.js';

export const app = express();

app.use(cors({
  credentials: true,
  origin: env.ORIGIN || "localhost:4200"

}));
app.use(express.json());
app.use('/api', healthRouter);
app.use('/api', menuRouter);
