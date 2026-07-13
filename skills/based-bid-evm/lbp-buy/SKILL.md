# Buy Token Skill

## Description

Buy tokens from a Liquidity Bootstrapping Pool (LBP) or a Flash Token on the based.bid platform. This skill handles token purchases with configurable slippage protection and referral tracking.

The buy functionality supports multiple EVM chains (Ethereum, BSC, Base, Robinhood Chain) and interacts with the TradeFacet smart contract to execute token purchases. The skill obtains transaction data from the BasedBid API, estimates gas, and submits the transaction on-chain.

## Agent Behavior

When the user requests to buy tokens, collect these required inputs:

1. **address**: Token/LBP contract address (0x...)
2. **amount**: Purchase amount in native token (e.g., 0.01)
3. **chainId**: Default is Base (8453). Options: 1 (Ethereum), 56 (BSC), 8453 (Base), 4663 (Robinhood Chain)

**Optional:**
- slippage: 1, 5, or 10 percent (default: 5)
- referrer: Wallet address for referral tracking (default: zero address)

**Confirmation:** Display transaction preview (amount, estimated gas, total cost) and require user confirmation before executing.

### JSON Template

Generate this config, replacing the marked values with user input:

```json
{
  "isSandboxMode": true,
  "chainId": <USER_INPUT:chainId>,
  "address": "<USER_INPUT:address>",
  "slippage": <USER_INPUT:slippage>,
  "referrer": "<USER_INPUT:referrer>",
  "amount": <USER_INPUT:amount>
}
```

**Default values:** chainId=8453, slippage=5, referrer=0x0000000000000000000000000000000000000000

**To execute:**
```bash
npm run evm:lbp-buy -- evm-lbp-buy <config_file> --dry-run
# Then run without --dry-run to execute
```

---

## Invocation

Run the buy script directly using ts-node:

```bash
npx ts-node src/buy.ts
```

Or build and run:

```bash
npm run build && node dist/buy.js
```

## Parameters

The `buyEvm` function accepts a `BuyEvmSdk` type (inferred from `buyEvmSdkSchema`):

```typescript
import { BuyEvmSdk } from 'schema/buy/evm/sdk';

// Schema definition (for reference):
// buyEvmSdkSchema = z.object({
//   chainId: evmChainIdSchema,          // 1 | 56 | 8453 | 4663
//   address: evmAddressSchema,          // 0x... token/pool address
//   slippage: z.union([z.literal(1), z.literal(5), z.literal(10)]),
//   referrer: evmAddressSchema,         // referral address
//   amount: z.number().min(0),          // amount in native currency
// })
```

| Parameter  | Type     | Description                | Constraints                       |
| ---------- | -------- | -------------------------- | --------------------------------- |
| `chainId`  | `number` | Blockchain network ID      | Must be 1, 56, 8453, or 4663            |
| `address`  | `string` | Token/LBP contract address | Valid EVM address (0x...)         |
| `slippage` | `number` | Maximum allowed slippage   | Must be 1, 5, or 10 (percent)     |
| `referrer` | `string` | Referral wallet address    | Valid EVM address or zero address |
| `amount`   | `number` | Purchase amount            | Must be >= 0 (in native token)    |

**Note:** `account` is auto-derived from the `PRIVATE_KEY` env variable via `privateKeyToAccount()`. You do not pass it as an argument.

## Configuration

The script reads configuration from environment variables (see `.env`):

| Variable      | Description                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `PRIVATE_KEY` | Wallet private key for signing transactions                                                      |

## Execution Flow

1. **Environment Validation** - Validates required environment variables (`PRIVATE_KEY`)
2. **Input Validation** - Schema validation via `buyEvmSdkSchema` (Zod) from `schema/buy/evm/sdk`
3. **API Request** - Payload sent to `${API_URL}/lbp-buy-preview` which returns:
   - Contract function name to call
   - Contract address
   - ABI-encoded arguments
   - Transaction value
   - Chain information
4. **Client Initialization** - Creates public and wallet clients using `initEvmClients` (BasedBid RPC proxy for the config `chainId`)
5. **Transaction** - Signed and sent via `sendTransaction` utility
   - Gas estimation
   - Transaction submission
   - Confirmation waiting (120s timeout)

## API Response

The BasedBid `/lbp-buy-preview` endpoint returns a `BuyResponse`:

```typescript
interface BuyResponse {
  ok: boolean;
  functionName: string; // Contract function to call (e.g., "buy")
  address: string; // Contract address to interact with
  args: unknown[]; // ABI-encoded function arguments
  value: string; // Transaction value in wei
  chain: {
    id: number;
    name: string;
  };
  data: BuyRequest; // Echo of the original request
}
```

## Slippage Protection

The `slippage` parameter protects against price movements during transaction execution:

| Slippage | Use Case                                                     |
| -------- | ------------------------------------------------------------ |
| `1`      | Low volatility, tight spreads (recommended for stable pairs) |
| `5`      | Moderate volatility (standard recommendation)                |
| `10`     | High volatility, low liquidity (higher tolerance)            |

Higher slippage increases the chance of transaction success but may result in receiving fewer tokens than expected.

## Referral System

Set `referrer` to a valid wallet address to allocate referral fees to that address. Use the zero address (`0x0000000000000000000000000000000000000000`) for no referrer:

```typescript
referrer: '0x0000000000000000000000000000000000000000'; // No referral
referrer: '0xeeEEeeEE...'; // Referral fees go to this address
```

## Output

On success, the script outputs:

- Transaction hash
- Block number
- Gas used
- Transaction status (Success/Failed)
- Block explorer URL (Basescan, Etherscan, or BscScan depending on chain)

## Error Handling

Common errors:

| Error                    | Cause                                                                 | Fix                                                            |
| ------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `Invalid environment`    | Missing or invalid `.env` variables                                   | Check `PRIVATE_KEY` is set correctly                           |
| `Invalid EVM address`    | Malformed address in request                                          | Ensure all addresses are 42-character hex strings (0x...)      |
| `Buy LBP request failed` | API server error                                                      | Check API availability and network connectivity                |
| `Transaction reverted`   | On-chain failure (insufficient funds, slippage exceeded, pool paused) | Check wallet balance, increase slippage, or verify pool status |
| `Gas estimation failed`  | Contract call will fail                                               | Verify token address is correct and pool has liquidity         |

## Example Usage

### Basic Buy

```typescript
import { buyEvm } from './src/scripts/evm/lbp-buy';

const receipt = await buyEvm({
  chainId: 8453, // Base
  address: '0x9851fe835121322a7f467e01CC6eb8217F342b1d',
  slippage: 1,
  referrer: '0x0000000000000000000000000000000000000000',
  amount: 0.00001, // 0.00001 ETH
});

console.log('Transaction confirmed:', receipt.transactionHash);
```

### Buy with Referral

```typescript
const receipt = await buyEvm({
  chainId: 8453,
  address: '0x...token_address...',
  slippage: 5,
  referrer: '0x...referrer_wallet...', // Referral fees go here
  amount: 0.001,
});
```

### Higher Slippage for Volatile Pairs

```typescript
const receipt = await buyEvm({
  chainId: 1, // Ethereum
  address: '0x...token_address...',
  slippage: 10, // Higher tolerance for volatile tokens
  referrer: '0x0000000000000000000000000000000000000000',
  amount: 0.5, // 0.5 ETH
});
```

## Multi-Chain Support

The buy skill automatically handles different chains:

| Chain    | Chain ID | Block Explorer |
| -------- | -------- | -------------- |
| Ethereum | 1        | etherscan.io   |
| BSC      | 56       | bscscan.com    |
| Robinhood Chain | 4663     | robinhoodchain.blockscout.com |
| Base     | 8453     | basescan.org   |

The `chainId` parameter determines which network the transaction is executed on. The SDK routes RPC through `https://cdn.based.bid/api/rpc/evm` for that chain.

## Gas Estimation

The skill automatically estimates gas before sending:

1. Calls `publicClient.estimateContractGas()` with the buy parameters
2. Uses the estimate (with optional buffer) for the actual transaction
3. Reports actual gas used after confirmation

Gas costs vary by network congestion and transaction complexity.

## Best Practices

1. **Start small** - Test with small amounts first to verify the pool/address
2. **Check pool status** - Ensure the LBP is active and not paused
3. **Monitor slippage** - Use lower slippage (1%) for stable tokens, higher (5-10%) for volatile launches
4. **Verify addresses** - Double-check token addresses before buying
5. **Check gas prices** - Consider network congestion on Ethereum mainnet
6. **Use referral codes** - Set a referrer to support community members

## Integration Notes

The buy function is designed to be used programmatically:

```typescript
// Import and call directly
import { buyEvm } from './src/scripts/evm/lbp-buy';

// Or run the self-executing script
// npx ts-node src/scripts/evm/lbp-buy.ts
```

The self-executing async IIFE at the bottom of `buy.ts` demonstrates usage with hardcoded values for testing.

## Sandbox Mode

For EVM chains, `isSandboxMode` is accepted in the SDK schema but **has no effect** — all operations execute on mainnet of the target chain (Ethereum, BSC, Base, or Robinhood Chain). The parameter exists for API consistency with Solana workflows.

When using Solana, setting `isSandboxMode: true` routes to **testnet.based.bid** instead of the mainnet based.bid app, allowing experimentation without real funds. EVM always uses mainnet regardless of this setting.

```typescript
// isSandboxMode is accepted but ignored for EVM
await buyEvm({
  chainId: 8453,
  address: '0x9851fe835121322a7f467e01CC6eb8217F342b1d',
  slippage: 1,
  referrer: '0x0000000000000000000000000000000000000000',
  amount: 0.00001,
  isSandboxMode: true,  // Accepted but no effect on EVM (always uses mainnet)
});
```

## Transaction Confirmation

**Important for AI Agents:** When executing this skill, you MUST:

1. **Display the transaction cost preview** to the user (shown automatically)
2. **Wait for user confirmation** before proceeding with the transaction
3. **Do not submit the transaction** until the user explicitly approves

The script will prompt: `Do you want to proceed? (y/n):`

- Type `y` or `yes` to confirm and submit the transaction
- Type `n` or `no` to cancel the operation
- The transaction will NOT be submitted until explicit confirmation is received

**Automated flows:** Set `SKIP_TX_CONFIRMATION=true` environment variable or use `isSandboxMode: true` to bypass the confirmation prompt (for testing/automation).
