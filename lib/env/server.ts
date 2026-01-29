import 'server-only';

import { z } from 'zod';
import { publicEnv } from './public';

function loadEnvFileOverride(filePath: string) {
  try {
    // Lazy require to keep this module portable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs') as typeof import('node:fs');
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

// In local/dev, prefer repo .env files over machine-level env vars. Next.js loads env files
// but doesn't overwrite existing process.env by default, which can lead to mismatched Supabase keys.
if (process.env.NODE_ENV !== 'production') {
  loadEnvFileOverride('.env');
  loadEnvFileOverride('.env.local');
}

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(1).optional(),
  GMAIL_USER: z.string().min(1).optional(),
  GMAIL_APP_PASSWORD: z.string().min(1).optional(),
  APP_BASE_URL: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  BRAND_NAME: z.string().min(1).optional(),
  BRAND_LOGO_URL: z.string().min(1).optional(),
  BRAND_ADDRESS: z.string().min(1).optional(),
  SUPPORT_EMAIL: z.string().min(1).optional(),
  NODE_ENV: z.string().min(1).optional(),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

export const serverEnv: ServerEnv & typeof publicEnv = {
  ...publicEnv,
  ...serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
    GMAIL_USER: process.env.GMAIL_USER,
    GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
    APP_BASE_URL: process.env.APP_BASE_URL,
    EMAIL_FROM: process.env.EMAIL_FROM,
    BRAND_NAME: process.env.BRAND_NAME,
    BRAND_LOGO_URL: process.env.BRAND_LOGO_URL,
    BRAND_ADDRESS: process.env.BRAND_ADDRESS,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
    NODE_ENV: process.env.NODE_ENV,
  }),
};
