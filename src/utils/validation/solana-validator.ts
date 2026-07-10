import { OpenbidRunOptions, resolveRunMode } from 'interfaces/common';
import { getSolanaEnvironment } from 'schema/environment';
import { ZodObject } from 'zod';

export class SolanaValidator {
  static validate<T>(
    validator: ZodObject,
    data: unknown,
    runOptions?: OpenbidRunOptions,
  ) {
    const { dryRun, validate, printPayload } = resolveRunMode(runOptions);
    const skipEnvValidation = validate || dryRun;
    const env = getSolanaEnvironment({ optional: skipEnvValidation });

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
