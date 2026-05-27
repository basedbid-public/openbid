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
  EVM_RPC_URL: optionalNonEmptyString,
});

const solanaEnvSchema = z.object({
  SOLANA_PRIVATE_KEY: optionalNonEmptyString,
  SOLANA_RPC_URL: optionalNonEmptyString,
});

export const validateEnvironment = () => {
  const parsed = evmEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  const env = parsed.data;
  if (!env.PRIVATE_KEY || !env.EVM_RPC_URL) {
    printNextSteps('What To Try Next', [
      'Add PRIVATE_KEY=<0x...> and EVM_RPC_URL=<rpc-url> to .env.',
      'Then rerun the same EVM command.',
    ]);
    throw new Error('PRIVATE_KEY and EVM_RPC_URL must be defined');
  }

  return {
    PRIVATE_KEY: env.PRIVATE_KEY,
    EVM_RPC_URL: env.EVM_RPC_URL,
  };
};

export const validateEnvironmentSolana = () => {
  const parsed = solanaEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  const env = parsed.data;
  if (!env.SOLANA_PRIVATE_KEY || !env.SOLANA_RPC_URL) {
    printNextSteps('What To Try Next', getSolanaEnvironmentHint());
    throw new Error('SOLANA_PRIVATE_KEY and SOLANA_RPC_URL must be defined');
  }

  return {
    SOLANA_PRIVATE_KEY: env.SOLANA_PRIVATE_KEY,
    SOLANA_RPC_URL: env.SOLANA_RPC_URL,
  };
};
