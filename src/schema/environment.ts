import { getSolanaEnvironmentHint, printNextSteps } from 'utils/next-steps';
import { z } from 'zod';

const optionalNonEmptyString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const evmEnvSchema = z.object({
  PRIVATE_KEY: optionalNonEmptyString.transform(
    (val) => val as `0x${string}` | undefined,
  ),
});

const solanaEnvSchema = z.object({
  SOLANA_PRIVATE_KEY: optionalNonEmptyString,
});

export const validateEnvironment = () => {
  const parsed = evmEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  const env = parsed.data;
  if (!env.PRIVATE_KEY) {
    printNextSteps('What To Try Next', [
      'Add PRIVATE_KEY=<0x...> to .env.',
      'Then rerun the same EVM command.',
    ]);
    throw new Error('PRIVATE_KEY must be defined');
  }

  return {
    PRIVATE_KEY: env.PRIVATE_KEY,
  };
};

export const validateEnvironmentSolana = () => {
  const parsed = solanaEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  const env = parsed.data;
  if (!env.SOLANA_PRIVATE_KEY) {
    printNextSteps('What To Try Next', getSolanaEnvironmentHint());
    throw new Error('SOLANA_PRIVATE_KEY must be defined');
  }

  return {
    SOLANA_PRIVATE_KEY: env.SOLANA_PRIVATE_KEY,
  };
};
