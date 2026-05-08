import express from 'express';
import { healthRouter } from './routes/health.js';
import { menuRouter } from './routes/menu.js';

export const app = express();

app.use(express.json());
app.use('/api', healthRouter);
app.use('/api', menuRouter);
