# Sell LBP Token (Solana) Skill

## Description

Sell tokens from a Liquidity Bootstrapping Pool (LBP) or Flash Token on **Solana** via the based.bid platform. This skill handles sell transaction preview generation, signing, and broadcasting on Solana devnet (Chain ID 5011).

Unlike the EVM sell flow (which requires two transactions: approve + sell), the Solana version typically requires only **one transaction** — the API returns a base64-encoded compiled VersionedTransaction that handles both token transfer and swap execution.

## Agent Behavior

When the user requests to sell tokens on Solana, collect these required inputs:

1. **address**: Token mint address (Solana base58)
2. **amount**: Amount to sell in token units

**Optional:**
- slippage: 1, 5, or 10 percent (default: 5)

**Note:** chainId is always 5011 (Solana Devnet) for this skill.

**Confirmation:** Display transaction preview and require user confirmation before executing.

### JSON Template

Generate this config, replacing the marked values with user input:

```json
{
  "isSandboxMode": true,
  "chainId": 5011,
  "address": "<USER_INPUT:address>",
  "amount": <USER_INPUT:amount>,
  "slippage": <USER_INPUT:slippage>
}
```

**Default values:** slippage=5

**To execute:**
```bash
npm run solana:lbp-sell -- solana-lbp-sell <config_file> --dry-run
# Then run without --dry-run to execute
```

---

## Invocation

```bash
npx ts-node src/scripts/solana/lbp-sell.ts
```

Or build and run:

```bash
npm run build && node dist/scripts/solana/lbp-sell.js
```

## Parameters

The `sellSolana` function accepts a `SellSolanaSdk` type (inferred from `sellSolanaSdkSchema`):

```typescript
import { SellSolanaSdk } from 'schema/sell/solana/sdk';

// Schema definition:
// sellSolanaSdkSchema = z.object({
//   address: solanaAddressSchema,          // token mint address
//   amount: z.number().min(0),             // amount to sell
//   slippage: slippageSchema,              // typically 1 | 5 | 10
// })
```

| Parameter  | Type     | Description                | Constraints                 |
| ---------- | -------- | -------------------------- | --------------------------- |
| `address`  | `string` | Token mint address         | Valid Solana base58 address |
| `amount`   | `number` | Amount to sell             | Must be >= 0                |
| `slippage` | `number` | Maximum allowed slippage   | Typically 1, 5, or 10       |

**Note:** The `signer` (wallet address) is auto-derived from `SOLANA_PRIVATE_KEY`. You do not pass it as an argument. There is no `referrer` parameter for Solana sells.

## Configuration

Environment variables (see `.env`):

| Variable | Description |
|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Solana wallet private key (base58 or hex) |

## Execution Flow

1. **Environment Validation** - Validates `SOLANA_PRIVATE_KEY`
2. **Input Validation** - Schema validation via `sellSolanaSdkSchema.parse(args)`
3. **Solana Wrapper Init** - Creates RPC connection (BasedBid proxy) and signer from `SOLANA_PRIVATE_KEY`
4. **API Request** - Payload sent to `${API_URL}/sol/lbp-sell`:
   ```typescript
   {
     chainId: 5011,
     signer: solanaWrapper.publicKey,
     memeMint: data.address,
     amount: data.amount,
     slippage: data.slippage,
   }
   ```
5. **Transaction Processing**:
   - Receives base64 `transaction` from API
   - Signs with user's wallet
   - Sends via Solana RPC
6. **Confirmation** - Polls `getSignatureStatuses` until finalized

## API Response

The `/sol/lbp-sell` endpoint returns a `SellSolanaResponse`:

```typescript
interface SellSolanaResponse {
  ok: boolean;
  chainId: number;              // 5011
  chainSymbol: string;          // "tsol"
  transaction: string;          // base64-encoded compiled VersionedTransaction
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote: string;
  // ... additional fields
}
```

## Output

On success, the script outputs:

- Transaction signature
- Explorer URL: `https://explorer.solana.com/tx/{signature}?cluster=devnet`

## Example Usage

### Basic Sell

```typescript
import { sellSolana } from './src/scripts/solana/lbp-sell';

await sellSolana({
  address: 'HosNdWFESKtjAiJbyXBxu7pX6iBADgBZuZ7BgPdo6bid',
  amount: 1000,
  slippage: 1,
});
```

### Higher Slippage for Volatile Tokens

```typescript
await sellSolana({
  address: 'HosNdWFESKtjAiJbyXBxu7pX6iBADgBZuZ7BgPdo6bid',
  amount: 5000,
  slippage: 5,
});
```

## Slippage Protection

| Slippage | Use Case |
|----------|----------|
| `1`      | Low volatility, tight spreads |
| `5`      | Moderate volatility (standard) |
| `10`     | High volatility, low liquidity |

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid environment` | Missing env variables | Check `.env` has `SOLANA_PRIVATE_KEY` |
| `Failed to sell ... on Solana` | API error | Check token address, balance, and API availability |
| `Transaction failed` | On-chain failure | Check wallet has SOL and sufficient token balance |

## Comparison: EVM vs Solana Sell

| Aspect | EVM | Solana |
|--------|-----|--------|
| Chain ID | 1 / 56 / 8453 / 4663 | 5011 |
| Transactions | 2 (approve + sell) | 1 (single compiled tx) |
| Address param | `address` (pool contract) | `address` (token mint) |
| `account` | Passed in args | Derived from `SOLANA_PRIVATE_KEY` |
| `referrer` | Supported | Not supported |
| Gas/Token flow | Approve ERC20, then TradeFacet swap | Single VersionedTransaction |

## Sandbox Mode

Solana supports sandbox mode for testing. When `isSandboxMode: true` is passed:

- The transaction is submitted via **testnet.based.bid** instead of the mainnet based.bid app
- Operations execute against test infrastructure
- No real funds are used

```typescript
await sellSolana({
  isSandboxMode: true,  // Enable sandbox mode (uses testnet.based.bid)
  address: 'HosNdWFESKtjAiJbyXBxu7pX6iBADgBZuZ7BgPdo6bid',
  amount: 1000,
  slippage: 1,
});
```

**Default:** `false` (uses mainnet based.bid)

## Transaction Confirmation

**Important for AI Agents:** When executing this skill, you MUST:

1. **Display the transaction cost preview** to the user (shown automatically - includes estimated SOL fee)
2. **Wait for user confirmation** before proceeding with the transaction
3. **Do not submit the transaction** until the user explicitly approves

The script will prompt: `Do you want to proceed? (y/n):`

- Type `y` or `yes` to confirm and submit the transaction
- Type `n` or `no` to cancel the operation
- The transaction will NOT be submitted until explicit confirmation is received

**Automated flows:** Set `SKIP_TX_CONFIRMATION=true` environment variable or use `isSandboxMode: true` to bypass the confirmation prompt (for testing/automation).

## Best Practices

1. **Check token balance** - Ensure you have enough tokens to sell
2. **Monitor slippage** - Use lower slippage for stable tokens, higher for volatile ones
3. **Consider timing** - Large sells can impact token price
4. **Verify addresses** - Double-check the mint address (you're selling THIS token)
5. **Ensure SOL balance** - Your wallet needs SOL for transaction fees
6. **Use sandbox mode for testing** - Set `isSandboxMode: true` to test without real funds
