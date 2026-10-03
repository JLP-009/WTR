import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRY: z.string().min(1).default('15m'),
  CORS_ORIGIN: z.string().url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  WS_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
  SIMULATION_TICK_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),
});

export type Environment = z.infer<typeof environmentSchema>;
export const loadEnvironment = (input: NodeJS.ProcessEnv = process.env): Environment => {
  try {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile();
    }
  } catch {
    // Ignore if .env is not found or already loaded
  }
  return environmentSchema.parse(input);
};

