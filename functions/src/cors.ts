import type { Request, Response } from 'express';

const ALLOWED_ORIGINS = new Set([
  'https://vcanship-onestop-logistics.web.app',
  'https://vcanresources.com',
  'https://www.vcanresources.com'
]);

export function applyCors(req: Request, res: Response): void {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
  } else {
    res.set('Access-Control-Allow-Origin', 'https://vcanship-onestop-logistics.web.app');
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleCorsPreflight(req: Request, res: Response): boolean {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.status(204).send('');
    return true;
  }
  return false;
}

export const allowedOrigins = ALLOWED_ORIGINS;
