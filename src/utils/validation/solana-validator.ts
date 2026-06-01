import { OpenbidRunOptions } from 'interfaces/common';
import { getSolanaEnvironment } from 'schema/environment';
import { ZodObject } from 'zod';

export class SolanaValidator {
  static validate<T>(
    validator: ZodObject,
    data: unknown,
    runOptions?: OpenbidRunOptions,
  ) {
    const skipEnvValidation =
      runOptions?.validate === true || runOptions?.dryRun === true;
    const env = getSolanaEnvironment({ optional: skipEnvValidation });

    const input = validator.safeParse(data);
    if (!input.success) {
      throw new Error('Validation failed: ' + input.error.message);
    }

    if (runOptions?.printPayload) {
      console.table(input.data);
    }

    return { data: input.data as T, env };
  }
}
