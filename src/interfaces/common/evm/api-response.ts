/**
 * Common response shape returned by based.bid's EVM "preview" endpoints (create-flash,
 * create-lbp, lbp-buy-preview, collect-fee, etc). Describes an unsigned contract call
 * that the SDK still needs to sign and send - it is NOT a transaction receipt (see
 * `sendTransaction`'s return value for that). `ok: false` responses throw before this
 * shape is used, so callers can assume `ok` is always `true` here.
 */
export interface EvmApiResponse {
  ok: boolean;
  /** Contract function to call, e.g. "createFlash" or "collectFeeForLBPFacet". Must match a function name in the relevant ABI JSON. */
  functionName: string;
  /** Contract address to call `functionName` on. */
  address: `0x${string}`;
  /** Function arguments as returned by the API - often a flat array that needs `normalizeByAbi` to expand into the tuples the ABI expects. */
  args: unknown[];
  /** msg.value to send with the transaction, in wei, as a string (parse with `BigInt`). */
  value: string;
  chain: {
    id: number;
    name: string;
  };
}
