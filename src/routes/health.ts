import { Router } from 'express';
import { pool } from '../database/pool.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok' });

  } catch {
    return res.status(500).json({ status: 'error' });

  }
  
});
