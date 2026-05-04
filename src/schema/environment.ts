import { z } from 'zod';

const envSchema = z.object({
  PRIVATE_KEY: z
    .string()
    .min(1, 'PRIVATE_KEY must not be empty')
    .transform((val) => val as `0x${string}`),
  RPC_URL: z.string().min(1, 'RPC_URL must not be empty'),
});

export const validateEnvironment = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  if (!parsed.data) {
    throw new Error(`Invalid environment: ${JSON.stringify(parsed, null, 2)}`);
  }

  return parsed.data;
};
