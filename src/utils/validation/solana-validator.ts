import { validateEnvironmentSolana } from 'schema/environment';
import { ZodObject } from 'zod';

export class SolanaValidator {
  static validate<T>(
    validator: ZodObject,
    data: unknown,
    printPayload: boolean = false,
  ) {
    const env = validateEnvironmentSolana();

    const input = validator.safeParse(data);
    if (!input.success) {
      throw new Error('Validation failed: ' + input.error.message);
    }

    if (printPayload) {
      console.table(input.data);
    }

    return { data: input.data as T, env };
  }
}
