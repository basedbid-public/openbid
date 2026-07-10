/**
 * Execution mode passed to every `createX`/`buy`/`sell`/`claimXFees` SDK function to
 * control how far a call proceeds, without changing the input payload itself. Set via
 * the `--dry-run`/`--validate` CLI flags in `src/helpers/run.ts`, or passed directly
 * when calling the SDK functions programmatically. Defaults to `'live'` when omitted.
 *
 * Note this is orthogonal to `isSandboxMode` (a field on each operation's own SDK input
 * schema, e.g. `createSolanaFlashInputSchema.isSandboxMode`), which selects which
 * network/backend a request targets. `mode` and `isSandboxMode` can be combined freely -
 * e.g. `{ isSandboxMode: true }` in the input plus `{ mode: 'dry-run' }` in options
 * previews a sandbox-network launch without sending anything.
 *
 * - `'live'` (default): validate, build the payload, upload to IPFS, call the API, and send the on-chain transaction.
 * - `'dry-run'`: validate and build the full payload (logged to the console), but stop before any IPFS upload, API call, or on-chain transaction.
 * - `'validate'`: only run schema validation against the input args, then return immediately - no payload is built and nothing is logged beyond a pass/fail summary.
 */
export type OpenbidRunMode = 'live' | 'dry-run' | 'validate';

export interface OpenbidRunOptions {
  mode?: OpenbidRunMode;
}

/**
 * Expands `OpenbidRunOptions.mode` into the three booleans SDK scripts branch on
 * internally (`dryRun`, `validate`, `printPayload`). Centralizes the
 * `mode === 'dry-run' || mode === 'validate'` checks that used to be three independent,
 * separately-settable flags - `printPayload` in particular was never meaningful on its
 * own, it was always derived from the other two.
 */
export const resolveRunMode = (options?: OpenbidRunOptions) => {
  const mode = options?.mode ?? 'live';

  return {
    mode,
    dryRun: mode === 'dry-run',
    validate: mode === 'validate',
    printPayload: mode === 'dry-run' || mode === 'validate',
  };
};
