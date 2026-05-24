# Claim LBP Fees (Solana) Skill

## Description

Claim accumulated trading fees from an LBP (Liquidity Bootstrapping Pool) on **Solana**. This skill calls the BasedBid API at `/sol/collect-lbp-fees`, receives a base64-encoded compiled transaction, signs it with the user's wallet, and broadcasts it on Solana devnet.

## Invocation

```bash
npx ts-node src/scripts/solana/claim-lbp-fees.ts
```

Or build and run:

```bash
npm run build && node dist/scripts/solana/claim-lbp-fees.js
```

## Parameters

The `claimLbpFeesSolana` function accepts a `ClaimFeesSolanaRequest` type:

```typescript
import { ClaimFeesSolanaRequest } from 'schema/claim-fees/solana/request';

// Schema definition:
// claimFeesSolanaRequestSchema = z.object({
//   chainId: solanaChainIdSchema,    // 5011
//   address: solanaAddressSchema,    // LBP token mint address
// })
```

| Parameter | Type     | Description              | Constraints               |
|-----------|----------|--------------------------|---------------------------|
| `chainId` | `number` | Blockchain network ID    | Must be 5011 (devnet)     |
| `address` | `string` | LBP token mint address   | Valid Solana base58 address |

**Note:** The `signer` (wallet address) is auto-derived from `SOLANA_PRIVATE_KEY` via `SolanaWrapper`. You do not pass it as an argument.

## Configuration

Environment variables (see `.env`):

| Variable | Description |
|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Solana wallet private key (base58 or hex) |
| `SOLANA_RPC_URL` | Solana RPC endpoint |

## Execution Flow

1. **Environment Validation** - Validates `SOLANA_PRIVATE_KEY` and `SOLANA_RPC_URL`
2. **Solana Wrapper Init** - Creates RPC connection and signer from `SOLANA_PRIVATE_KEY`
3. **API Request** - Payload sent to `https://cdn.based.bid/api/sol/collect-lbp-fees`:
   ```typescript
   {
     chainId: params.chainId,
     signer: solanaWrapper.publicKey,
     memeMint: params.address,
   }
   ```
4. **Transaction Processing**:
   - Receives base64 `transaction` from API
   - Signs with user's wallet via `solanaWrapper.sendTransaction()`
   - Sends via Solana RPC
5. **Confirmation** - Polls `getSignatureStatuses` until finalized

## API Response

The endpoint returns a `ClaimSolanaFeeResponse`:

```typescript
interface ClaimSolanaFeeResponse {
  ok: boolean;
  chainId: number;              // 5011
  chainSymbol: string;
  transaction: string;            // base64-encoded compiled VersionedTransaction
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

```typescript
import { claimLbpFeesSolana } from './src/scripts/solana/claim-lbp-fees';

await claimLbpFeesSolana({
  chainId: 5011,
  address: 'JZYVVHDmgVb8TbUy8eVhFEamuS4uRzYrP5BQc3Kmbid',
});
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid environment` | Missing env variables | Check `.env` configuration |
| `Failed to claim LBP fees on Solana` | API error | Check token address and API availability |
| `Transaction failed` | On-chain failure | Verify you are the pool owner, ensure fees exist |

## Best Practices

1. **Verify ownership** - Only the pool owner can claim fees
2. **Check fee balance** - Ensure there are accumulated fees
3. **Ensure SOL balance** - Your wallet needs SOL for transaction fees
