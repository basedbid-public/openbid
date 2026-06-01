# Buy LBP Token (Solana) Skill

## Description

Buy tokens from a Liquidity Bootstrapping Pool (LBP) or Flash Token on **Solana** via the based.bid platform. This skill handles transaction preview generation, signing, and broadcasting on Solana devnet (Chain ID 5011).

Unlike the EVM buy flow, the Solana version receives a base64-encoded compiled VersionedTransaction from the API, attaches blockhash lifetime, signs it with the user's wallet, and sends it via Solana RPC.

## Invocation

```bash
npx ts-node src/scripts/solana/lbp-buy.ts
```

Or build and run:

```bash
npm run build && node dist/scripts/solana/lbp-buy.js
```

## Parameters

The `buySolana` function accepts a `BuySolanaSdk` type (inferred from `buySolanaSdkSchema`):

```typescript
import { BuySolanaSdk } from 'schema/buy/solana/sdk';

// Schema definition:
// buySolanaSdkSchema = z.object({
//   address: solanaAddressSchema,          // token mint address
//   amount: z.number().min(0),             // amount to buy
//   slippage: slippageSchema,             // typically 1 | 5 | 10
//   referrer: solanaAddressSchema.default(SOLANA_ZERO_ADDRESS),
// })
```

| Parameter  | Type     | Description                | Constraints                        |
| ---------- | -------- | -------------------------- | ---------------------------------- |
| `address`  | `string` | Token mint address         | Valid Solana base58 address        |
| `amount`   | `number` | Amount to buy              | Must be >= 0                       |
| `slippage` | `number` | Maximum allowed slippage   | Typically 1, 5, or 10 (percent)    |
| `referrer` | `string` | Referral wallet address    | Valid Solana address or zero address |

**Note:** The `signer` (wallet address) is auto-derived from `SOLANA_PRIVATE_KEY`. You do not pass it as an argument.

## Configuration

Environment variables (see `.env`):

| Variable | Description |
|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Solana wallet private key (base58 or hex) |

## Execution Flow

1. **Environment Validation** - Validates `SOLANA_PRIVATE_KEY`
2. **Input Validation** - Schema validation via `buySolanaSdkSchema.parse(args)`
3. **Solana Wrapper Init** - Creates RPC connection (BasedBid proxy) and signer from `SOLANA_PRIVATE_KEY`
4. **API Request** - Payload sent to `${API_URL}/sol/lbp-buy`:
   ```typescript
   {
     chainId: 5011,
     signer: solanaWrapper.publicKey,
     memeMint: data.address,
     amount: data.amount,
     slippage: data.slippage,
     tokenBalance: '0.001',
     referrer: data.referrer,
   }
   ```
5. **Transaction Processing**:
   - Receives base64 `transaction` from API
   - Signs with user's wallet
   - Sends via Solana RPC
6. **Confirmation** - Polls `getSignatureStatuses` until finalized

## API Response

The `/sol/lbp-buy` endpoint returns a `BuySolanaResponse`:

```typescript
interface BuySolanaResponse {
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

### Basic Buy

```typescript
import { buySolana } from './src/scripts/solana/lbp-buy';

await buySolana({
  address: 'HosNdWFESKtjAiJbyXBxu7pX6iBADgBZuZ7BgPdo6bid',
  amount: 0.001,
  slippage: 1,
  referrer: '11111111111111111111111111111111',
});
```

### Buy with Referral

```typescript
await buySolana({
  address: 'HosNdWFESKtjAiJbyXBxu7pX6iBADgBZuZ7BgPdo6bid',
  amount: 0.01,
  slippage: 5,
  referrer: 'referrer_wallet_address',
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
| `Failed to buy ... on Solana` | API error | Check token address and API availability |
| `Transaction failed` | On-chain failure | Check wallet has SOL, verify slippage, pool status |

## Key Differences from EVM Buy

| Aspect | EVM | Solana |
|--------|-----|--------|
| Chain ID | 1 / 56 / 8453 | 5011 |
| Transaction | ABI-encoded contract call | Base64 compiled VersionedTransaction |
| Signers | Single wallet (via viem) | Wallet via SolanaWrapper |
| Address param | `address` (pool contract) | `address` (token mint) |
| `account` | Passed in args | Derived from `SOLANA_PRIVATE_KEY` |

## Sandbox Mode

Solana supports sandbox mode for testing. When `isSandboxMode: true` is passed:

- The transaction is submitted via **testnet.based.bid** instead of the mainnet based.bid app
- Operations execute against test infrastructure
- No real funds are used

```typescript
await buySolana({
  isSandboxMode: true,  // Enable sandbox mode (uses testnet.based.bid)
  address: 'HosNdWFESKtjAiJbyXBxu7pX6iBADgBZuZ7BgPdo6bid',
  amount: 0.001,
  slippage: 1,
  referrer: '11111111111111111111111111111111',
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

1. **Start small** - Test with small amounts first
2. **Monitor slippage** - Use 1% for stable tokens, 5-10% for volatile launches
3. **Check token address** - Double-check the mint address before buying
4. **Ensure SOL balance** - Your wallet needs SOL for transaction fees
5. **Use referral codes** - Set a referrer to support community members
6. **Use sandbox mode for testing** - Set `isSandboxMode: true` to test without real funds
