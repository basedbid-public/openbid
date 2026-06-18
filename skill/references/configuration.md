# Configuration

Use the current SDK schemas and bundled examples as the canonical field definitions.

## Sources of truth

Inspect these paths in the OpenBid checkout:

- `src/helpers/configs/solana/` for examples;
- `src/schema/lbp/solana/` for LBP inputs;
- `src/schema/flash-token/solana/` for Flash Token inputs;
- `src/schema/board/solana/` for Board inputs;
- `src/schema/buy/solana/` and `src/schema/sell/solana/` for trades;
- `src/schema/claim-fees/solana/` for claims;
- `src/constants/solana-chain-config.ts` for supported network identifiers.

Prefer schema behavior over copied prose. Flag discrepancies instead of guessing.

## Configuration workflow

1. Copy the closest bundled example to a new file.
2. Set `isSandboxMode: true` for the first run.
3. Set the intended chain ID explicitly.
4. Replace token metadata and local asset paths.
5. Replace every address and amount placeholder.
6. Review fee fields using [fee-routing.md](fee-routing.md).
7. Validate with the guardrail wrapper.
8. Correct schema errors one at a time.
9. Dry-run and compare the payload to the reviewed configuration.

## Required review summary

Before execution, display:

- operation;
- devnet or mainnet;
- sandbox status;
- payer public key;
- token name, symbol, supply, and decimals where applicable;
- board title where applicable;
- market-cap target or virtual-liquidity inputs;
- DEX and fee tier;
- every fee recipient and percentage;
- initial buy, trade, or claim amount;
- slippage;
- unresolved placeholders.

Block execution when any unresolved placeholder remains.

## API keys and secrets

Store keys only in `.env`, which must remain ignored by Git. A custom Board may require an OpenBid API key. Never embed it in JSON or Markdown.

## Numeric values

Preserve the numeric/string representation expected by each Zod schema. Do not normalize all numeric-looking values automatically. Solana token amounts and percentages may deliberately use strings to avoid precision loss.
