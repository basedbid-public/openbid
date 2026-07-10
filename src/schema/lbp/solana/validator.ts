import {
  CreateLbpSolanaApiPayload,
  createLbpSolanaApiPayloadSchema,
} from './api-request';
import { CreateSolanaLbpInput, createSolanaLbpInputSchema } from './sdk-input';

/** Validates SDK-input and API-payload args for Solana LBP creation against their respective Zod schemas, throwing a descriptive error on failure. */
export class SolanaLbpValidator {
  static validateInput(args: unknown): CreateSolanaLbpInput {
    const result = createSolanaLbpInputSchema.safeParse(args);

    if (!result.success) {
      throw new Error(
        `Invalid input arguments for LBP creation on Solana: ${result.error.message}`,
      );
    }

    return result.data;
  }

  static validateApi(payload: unknown): CreateLbpSolanaApiPayload {
    const result = createLbpSolanaApiPayloadSchema.safeParse(payload);

    if (!result.success) {
      throw new Error(
        `Invalid API payload for LBP creation on Solana: ${result.error.message}`,
      );
    }

    return result.data;
  }
}
