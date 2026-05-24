import {
  CreateLbpSolanaApiPayload,
  createLbpSolanaApiPayloadSchema,
} from 'schema/lbp/solana/api-request';
import { CreateSolanaFlashInput, createSolanaFlashInputSchema } from './sdk';

export class SolanaFlashValidator {
  static validateInput(args: unknown): CreateSolanaFlashInput {
    const result = createSolanaFlashInputSchema.safeParse(args);

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
