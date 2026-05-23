import { z } from 'zod';

const envSchema = z
  .object({
    PRIVATE_KEY: z
      .string()
      .transform((val) => val as `0x${string}`)
      .optional(),
    SOLANA_PRIVATE_KEY: z.string().optional(),
    EVM_RPC_URL: z.string().min(1, 'EVM_RPC_URL must not be empty'),
    SOLANA_RPC_URL: z.string().min(1, 'SOLANA_RPC_URL must not be empty'),
  })
  .superRefine((data, ctx) => {
    if (!data.PRIVATE_KEY && !data.SOLANA_PRIVATE_KEY) {
      ctx.addIssue({
        code: 'custom',
        message: 'Either PRIVATE_KEY or SOLANA_PRIVATE_KEY must be defined',
      });
    }
    if (!data.EVM_RPC_URL && !data.SOLANA_RPC_URL) {
      ctx.addIssue({
        code: 'custom',
        message: 'Either EVM_RPC_URL or SOLANA_RPC_URL must be defined',
      });
    }
    if (
      (data.PRIVATE_KEY && !data.EVM_RPC_URL) ||
      (!data.PRIVATE_KEY && data.EVM_RPC_URL)
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'If PRIVATE_KEY is defined, EVM_RPC_URL must be defined and vice versa',
      });
    }

    if (
      (data.SOLANA_PRIVATE_KEY && !data.EVM_RPC_URL) ||
      (!data.SOLANA_PRIVATE_KEY && data.EVM_RPC_URL)
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'If SOLANA_PRIVATE_KEY is defined, SOLANA_RPC_URL must be defined and vice versa',
      });
    }
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
