import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { menuRouter } from './routes/menu.js';
import { paymentsRouter } from './routes/payments.js';
import { env } from './config/env.js';

export const app = express();

app.use(cors({
  credentials: true,
  origin: env.ORIGIN || "http://localhost:4200"

}));

app.use(express.json());
app.use('/api', healthRouter);
app.use('/api', menuRouter);
app.use('/api', paymentsRouter);
