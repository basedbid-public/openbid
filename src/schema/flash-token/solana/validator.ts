import {
  CreateSolanaFlashTx1Api,
  CreateSolanaFlashTx2Api,
  createSolanaFlashTx1ApiSchema,
  createSolanaFlashTx2ApiSchema,
} from './api';
import { CreateSolanaFlashInput, createSolanaFlashInputSchema } from './sdk';

/**
 * Validates SDK-input and API-payload args for Solana Flash Token creation against
 * their respective Zod schemas, throwing a descriptive error on failure. Not currently
 * called by `createFlashTokenSolana` (that script validates input via the shared
 * `SolanaValidator.validate` helper and builds/sends its TX1/TX2 payloads directly), but
 * kept available for callers that want standalone validation.
 *
 * Flash Token launches involve two sequential API payloads (TX1 creates the mint, TX2
 * finalizes the pool - see ./api.ts), so there are two API validation methods instead of
 * the single `validateApi` used by `SolanaLbpValidator`.
 */
export class SolanaFlashValidator {
  static validateInput(args: unknown): CreateSolanaFlashInput {
    const result = createSolanaFlashInputSchema.safeParse(args);

    if (!result.success) {
      throw new Error(
        `Invalid input arguments for Flash Token creation on Solana: ${result.error.message}`,
      );
    }

    return result.data;
  }

  static validateApiTx1(payload: unknown): CreateSolanaFlashTx1Api {
    const result = createSolanaFlashTx1ApiSchema.safeParse(payload);

    if (!result.success) {
      throw new Error(
        `Invalid API payload for Flash Token creation (TX1) on Solana: ${result.error.message}`,
      );
    }

    return result.data;
  }

  static validateApiTx2(payload: unknown): CreateSolanaFlashTx2Api {
    const result = createSolanaFlashTx2ApiSchema.safeParse(payload);

    if (!result.success) {
      throw new Error(
        `Invalid API payload for Flash Token creation (TX2) on Solana: ${result.error.message}`,
      );
    }

    return result.data;
  }
}
