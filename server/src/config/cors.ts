
import { config } from './env.js';

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;

  if (config.allowedOrigins.includes(origin)) return true;

  // Allow local development on any localhost port.
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }

  // Support Vercel production and preview deployments
  if (origin === 'https://chatterly-self.vercel.app' || origin.endsWith('.vercel.app')) {
    return true;
  }

  // Support Render production and PR preview subdomains
  if (origin.endsWith('.onrender.com')) {
    return true;
  }

  return false;
}

export const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
