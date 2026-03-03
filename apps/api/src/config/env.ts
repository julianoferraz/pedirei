import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  MASTER_EMAIL: z.string().email(),
  MASTER_PASSWORD: z.string().min(6),
  OPENAI_API_KEY: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().default('Pedirei.Online <noreply@pedirei.online>'),
  API_URL: z.string().url().default('http://localhost:3001'),
  MENU_URL: z.string().default('http://localhost:3002'),
  ADMIN_URL: z.string().default('http://localhost:3003'),
  MASTER_URL: z.string().default('http://localhost:3004'),
  LANDING_URL: z.string().default('http://localhost:3005'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.coerce.number().default(5242880),
  ENCRYPTION_KEY: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
