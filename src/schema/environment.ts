import bs58 from 'bs58';
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

/** Hardhat account #0 — dry-run previews only, never for real transactions. */
export const DUMMY_EVM_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

/** Valid ed25519 seed — dry-run previews only, never for real transactions. */
export const DUMMY_SOLANA_PRIVATE_KEY = bs58.encode(new Uint8Array(32).fill(1));

export const getEvmEnvironment = (options?: { optional?: boolean }) => {
  const parsed = evmEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  const env = parsed.data;
  if (!env.PRIVATE_KEY) {
    if (options?.optional) {
      return { PRIVATE_KEY: DUMMY_EVM_PRIVATE_KEY };
    }

    printNextSteps('What To Try Next', [
      'Add PRIVATE_KEY=<0x...> to .env.',
      'Then rerun the same EVM command.',
    ]);
    throw new Error('PRIVATE_KEY must be defined');
  }

  return { PRIVATE_KEY: env.PRIVATE_KEY };
};

export const getSolanaEnvironment = (options?: { optional?: boolean }) => {
  const parsed = solanaEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  const env = parsed.data;
  if (!env.SOLANA_PRIVATE_KEY) {
    if (options?.optional) {
      return { SOLANA_PRIVATE_KEY: DUMMY_SOLANA_PRIVATE_KEY };
    }

    printNextSteps('What To Try Next', getSolanaEnvironmentHint());
    throw new Error('SOLANA_PRIVATE_KEY must be defined');
  }

  return { SOLANA_PRIVATE_KEY: env.SOLANA_PRIVATE_KEY };
};

/** @deprecated Use getEvmEnvironment */
export const validateEnvironment = () => getEvmEnvironment();

/** @deprecated Use getSolanaEnvironment */
export const validateEnvironmentSolana = () => getSolanaEnvironment();
