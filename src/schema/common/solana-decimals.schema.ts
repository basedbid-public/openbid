import { SOLANA_DECIMALS } from 'constants/solana';
import z from 'zod';

export const solanaDecimalsSchema = z.literal(SOLANA_DECIMALS);
