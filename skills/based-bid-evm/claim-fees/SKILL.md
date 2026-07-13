# Claim Fees (EVM) Skill

## Description

Claim accumulated trading fees from an LBP (Liquidity Bootstrapping Pool) on EVM chains. This skill invokes the `/collect-fee` BasedBid API endpoint, which returns ABI-encoded transaction data to collect fees from either the pool or the board contract.

Fee collection is a single on-chain transaction: the API returns the function name, contract address, ABI-encoded args, and `value` (msg.value), which are then signed and sent via `sendTransaction` using the `CollectFeeForLBPFacet` ABI.

## Agent Behavior

When the user requests to claim fees, collect these required inputs:

1. **address**: Pool or board contract address (0x...)
2. **target**: What to claim from - either `"pool"` or `"board"`
3. **chainId**: Default is Base (8453). Options: 1 (Ethereum), 56 (BSC), 8453 (Base), 4663 (Robinhood Chain)

**Confirmation:** Display fee amount estimate and require user confirmation before executing.

### JSON Template

Generate this config, replacing the marked values with user input:

```json
{
  "isSandboxMode": true,
  "chainId": <USER_INPUT:chainId>,
  "target": "<USER_INPUT:target>",
  "address": "<USER_INPUT:address>"
}
```

**Default values:** chainId=8453

**To execute:**
```bash
npm run evm:claim-fees -- evm-claim-fees <config_file> --dry-run
# Then run without --dry-run to execute
```

---

## Invocation

```bash
npx ts-node src/scripts/evm/claim-fees.ts
```

Or build and run:

```bash
npm run build && node dist/scripts/evm/claim-fees.js
```

## Parameters

The `claimEvmFees` function accepts a `ClaimEvmFeesSdk` type (inferred from `claimEvmFeesSdkSchema`):

```typescript
import { ClaimEvmFeesSdk } from 'schema/claim-fees/evm/sdk';

// Schema definition:
// claimEvmFeesSdkSchema = z.object({
//   address: evmAddressSchema,           // LBP/pool or board address
//   target: z.enum(['pool', 'board']),   // what to claim fees from
//   chainId: evmChainIdSchema,          // 1 | 56 | 8453 | 4663
// })
```

| Parameter | Type     | Description                    | Constraints               |
| --------- | -------- | ------------------------------ | ------------------------- |
| `chainId` | `number` | Blockchain network ID          | Must be 1, 56, 8453, or 4663    |
| `address` | `string` | Pool or board contract address | Valid EVM address (0x...) |
| `target`  | `string` | Fee collection target          | `"pool"` or `"board"`     |

**Note:** The `account` (wallet address) is auto-derived from `PRIVATE_KEY` via `privateKeyToAccount()`. You do not pass it as an argument.

## Configuration

Environment variables (see `.env`):

| Variable      | Description                                                |
| ------------- | ---------------------------------------------------------- |
| `PRIVATE_KEY` | Wallet private key for signing transactions                |

## Execution Flow

1. **Environment Validation** - Validates `PRIVATE_KEY`
2. **Client Initialization** - Creates `publicClient` and `walletClient` via `initEvmClients` (BasedBid RPC proxy for the config `chainId`)
3. **API Request** - Payload sent to `${API_URL}/collect-fee`:
   ```typescript
   {
     chainId: args.chainId,
     account: account.address,   // derived from PRIVATE_KEY
     target: args.target,        // "pool" or "board"
     address: args.address,
   }
   ```
4. **Transaction Construction** - API returns:
   - `functionName` - e.g. `"collectFeeForLBPFacet"`
   - `address` - contract to call
   - `args` - ABI-encoded arguments
   - `value` - msg.value in wei
5. **On-chain Execution** - Signed and sent via `sendTransaction` using `CollectFeeForLBPFacet` ABI

## API Response

The `/collect-fee` endpoint returns an `EvmApiResponse`:

```typescript
interface EvmApiResponse {
  ok: boolean;
  functionName: string; // Contract function to call
  address: string; // Contract address
  args: unknown[]; // ABI-encoded function arguments
  value: string; // Transaction value in wei
  chain: { id: number; name: string };
}
```

## Output

On success, the script outputs:

- Transaction hash
- Block number
- Gas used
- Transaction status
- Block explorer URL

## Example Usage

### Claim Pool Fees

```typescript
import { claimEvmFees } from './src/scripts/evm/claim-fees';

const receipt = await claimEvmFees({
  chainId: 8453,
  address: '0xbf004fd9d0b64E0203E8B209cdcb5FD37aFBBb1d',
  target: 'pool',
});

console.log('Fees claimed:', receipt.transactionHash);
```

### Claim Board Fees

```typescript
const receipt = await claimEvmFees({
  chainId: 8453,
  address: '0xbf004fd9d0b64E0203E8B209cdcb5FD37aFBBb1d',
  target: 'board',
});
```

## Error Handling

| Error                   | Cause                                   | Fix                                     |
| ----------------------- | --------------------------------------- | --------------------------------------- |
| `Invalid environment`   | Missing `PRIVATE_KEY`                   | Check `.env` configuration              |
| `Failed to claim fees`  | API returned an error                   | Check API availability and network      |
| `Transaction reverted`  | No fees to claim or unauthorized caller | Verify you are the pool/board owner     |
| `Gas estimation failed` | Contract call will fail                 | Check `address` is correct and has fees |

## Best Practices

1. **Verify ownership** - Only the pool or board owner can claim fees
2. **Check fee balance** - Ensure there are accumulated fees before claiming
3. **Use correct target** - `"pool"` for pool trading fees, `"board"` for board listing fees
4. **Consider gas costs** - Small fee claims may not be worth the gas on Ethereum mainnet

## Sandbox Mode

For EVM chains, `isSandboxMode` is accepted in the SDK schema but **has no effect** — all operations execute on mainnet of the target chain (Ethereum, BSC, Base, or Robinhood Chain). The parameter exists for API consistency with Solana workflows.

When using Solana, setting `isSandboxMode: true` routes to **testnet.based.bid** instead of the mainnet based.bid app, allowing experimentation without real funds. EVM always uses mainnet regardless of this setting.

```typescript
// isSandboxMode is accepted but ignored for EVM
await claimEvmFees({
  chainId: 8453,
  address: '0x...',
  target: 'pool',
  isSandboxMode: true, // Accepted but no effect on EVM (always uses mainnet)
});
```

## Transaction Confirmation

**Important for AI Agents:** When executing this skill, you MUST:

1. **Display the transaction cost preview** to the user (shown automatically - includes gas estimate and total cost in ETH)
2. **Wait for user confirmation** before proceeding with the transaction
3. **Do not submit the transaction** until the user explicitly approves

The script will prompt: `Do you want to proceed? (y/n):`

- Type `y` or `yes` to confirm and submit the transaction
- Type `n` or `no` to cancel the operation
- The transaction will NOT be submitted until explicit confirmation is received

**Automated flows:** Set `SKIP_TX_CONFIRMATION=true` environment variable or use `isSandboxMode: true` to bypass the confirmation prompt (for testing/automation).
