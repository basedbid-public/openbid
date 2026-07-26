# Troubleshooting

Diagnose failures by stage and avoid blind retries.

## Validation failures

Read the Zod error path, inspect the current schema, and change only the failing field. Common causes include:

- string versus number mismatches;
- unsupported enum values;
- invalid Solana addresses;
- missing metadata assets;
- fee totals outside schema constraints;
- placeholder values left in examples.

## Environment failures

Check for required variable names without printing their values. Typical variables include `SOLANA_RPC_URL`, `SOLANA_PRIVATE_KEY`, and a Board API key when applicable.

## API or upload failures

Record the endpoint, HTTP status, timestamp, and retry guidance. Do not expose authorization headers. Retry transient timeouts only after confirming no transaction was submitted.

## Transaction failures

Classify the failure:

- blockhash or address lookup table became stale;
- insufficient SOL or token balance;
- invalid account or mint;
- slippage limit exceeded;
- transaction simulation failed;
- RPC submission failed;
- submitted but not confirmed.

If a signature exists, inspect its status before rebuilding or resubmitting. If no signature exists and the error is clearly transient, repeat the dry-run before requesting retry approval.

## Documentation mismatch

When README text, legacy operation skills, and code differ:

1. inspect the current Zod schema and called implementation;
2. run validation;
3. state the mismatch;
4. avoid asserting unsupported behavior;
5. propose a documentation or test fix.
