import { SOLANA_DECIMALS } from 'constants/solana';
import z from 'zod';

/** Token decimals on Solana. Locked to `SOLANA_DECIMALS` (9) - Solana SPL tokens don't support a custom value here like EVM's 18-decimal ERC20s do. */
export const solanaDecimalsSchema = z
  .literal(SOLANA_DECIMALS)
  .describe(`Token decimals, must be exactly ${SOLANA_DECIMALS} on Solana`);
