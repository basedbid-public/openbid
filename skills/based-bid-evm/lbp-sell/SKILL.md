# Sell Token Skill

## Description

Sell tokens from a Liquidity Bootstrapping Pool (LBP) or Flash Token on the based.bid platform. This skill handles token sales with configurable slippage protection and consists of two sequential transactions: token approval and sell execution.

The sell functionality supports multiple EVM chains (Ethereum, BSC, Base) and interacts with both the ERC20 token contract (for approval) and the TradeFacet smart contract (for the sell execution). The skill obtains transaction data from the BasedBid API, estimates gas for both transactions, and submits them on-chain.

## Key Differences from Buy

Unlike buying, selling requires **two sequential transactions**:

1. **Approve Transaction** - Authorizes the pool contract to spend your tokens (ERC20 `approve`)
2. **Sell Transaction** - Executes the actual token swap (TradeFacet `sell`)

Both transactions must succeed for the sell to complete.

## Invocation

Run the sell script directly using ts-node:

```bash
npx ts-node src/sell.ts
```

Or build and run:

```bash
npm run build && node dist/sell.js
```

## Parameters

The `sell` function accepts a `SellRequest` interface:

```typescript
interface SellRequest {
  chainId: number; // 1 (Ethereum) | 56 (BSC) | 8453 (Base)
  address: string; // Token contract address (the token you're selling)
  account: string; // Seller's wallet address
  slippage: number; // 1 | 5 | 10 (percentage)
  referrer: string; // Referral address (use zero address for no referrer)
  amount: number; // Amount to sell (in token units, not ETH)
}
```

### Parameter Details

| Parameter  | Type     | Description                           | Constraints                       |
| ---------- | -------- | ------------------------------------- | --------------------------------- |
| `chainId`  | `number` | Blockchain network ID                 | Must be 1, 56, or 8453            |
| `address`  | `string` | Token contract address you're selling | Valid EVM address (0x...)         |
| `account`  | `string` | Seller's wallet address               | Valid EVM address (0x...)         |
| `slippage` | `number` | Maximum allowed slippage              | Must be 1, 5, or 10 (percent)     |
| `referrer` | `string` | Referral wallet address               | Valid EVM address or zero address |
| `amount`   | `number` | Amount to sell                        | Must be >= 0 (in token units)     |

## Configuration

The script reads configuration from environment variables (see `.env`):

| Variable      | Description                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `PRIVATE_KEY` | Wallet private key for signing transactions                                                      |
| `RPC_URL`     | RPC endpoint for blockchain communication (chain-agnostic URL that works on any supported chain) |

## Execution Flow

1. **Environment Validation** - Validates required environment variables (`PRIVATE_KEY`, `RPC_URL`)
2. **Input Validation** - Schema validation via `sellApiSchema` (Zod)
3. **API Request** - Payload sent to `${API_URL}/lbp-sell-preview` which returns two transactions:
   - `trx1`: ERC20 approve transaction data
   - `trx2`: TradeFacet sell transaction data
4. **RPC Initialization** - Creates public and wallet clients using `initRpcClients`
5. **First Transaction - Approve** - Sends ERC20 approve transaction via `sendTransaction`
6. **Second Transaction - Sell** - Sends TradeFacet sell transaction via `sendTransaction`

## API Response

The BasedBid `/lbp-sell-preview` endpoint returns a `SellResponse`:

```typescript
interface SellResponse {
  trx1: {
    functionName: string; // "approve"
    address: string; // Token contract address
    args: string[]; // [spenderAddress, amount]
    value: string; // "0" (no ETH required for approve)
  };
  trx2: {
    functionName: string; // "sell" or similar
    address: string; // Pool/LBP contract address
    args: string[]; // Sell function arguments
    value: string; // "0" (no ETH required for selling)
  };
  chain: {
    id: number;
    symbol: string;
  };
  data: SellRequest; // Echo of the original request
}
```

## Slippage Protection

The `slippage` parameter protects against price movements during transaction execution:

| Slippage | Use Case                                                      |
| -------- | ------------------------------------------------------------- |
| `1`      | Low volatility, tight spreads (recommended for stable tokens) |
| `5`      | Moderate volatility (standard recommendation)                 |
| `10`     | High volatility, low liquidity (higher tolerance)             |

Higher slippage increases the chance of transaction success but may result in receiving less of the output token (ETH/USDC/etc.) than expected.

## Referral System

Set `referrer` to a valid wallet address to allocate referral fees to that address. Use the zero address (`0x0000000000000000000000000000000000000000`) for no referrer:

```typescript
referrer: '0x0000000000000000000000000000000000000000'; // No referral
referrer: '0xABC123...'; // Referral fees go to this address
```

## Output

On success, the script outputs for **each transaction**:

- Transaction hash
- Block number
- Gas used
- Transaction status (Success/Failed)
- Block explorer URL (Basescan, Etherscan, or BscScan depending on chain)

Example output:

```
Approve transaction confirmed: 0x...
Sell transaction confirmed: 0x...
```

## Error Handling

Common errors:

| Error                          | Cause                                                    | Fix                                                       |
| ------------------------------ | -------------------------------------------------------- | --------------------------------------------------------- |
| `Invalid environment`          | Missing or invalid `.env` variables                      | Check `PRIVATE_KEY` and `RPC_URL` are set correctly       |
| `Invalid EVM address`          | Malformed address in request                             | Ensure all addresses are 42-character hex strings (0x...) |
| `Sell LBP request failed`      | API server error                                         | Check API availability and network connectivity           |
| `Approve transaction reverted` | Insufficient token balance or already approved           | Check your token balance                                  |
| `Sell transaction reverted`    | Slippage exceeded, pool paused, or insufficient approval | Increase slippage or check pool status                    |
| `Gas estimation failed`        | Contract call will fail                                  | Verify token address is correct and you have balance      |

## Example Usage

### Basic Sell

```typescript
import { sell } from './src/sell';

const receipt = await sell({
  chainId: 8453, // Base
  address: '0x9851fe835121322a7f467e01CC6eb8217F342b1d', // Token to sell
  account: '0xC307eE0832c269d0F2A326Aa0b481b6FA032B262', // Your wallet
  slippage: 1,
  referrer: '0x0000000000000000000000000000000000000000',
  amount: 1000, // Sell 1000 tokens
});

console.log('Sell confirmed:', receipt.transactionHash);
```

### Sell with Referral

```typescript
const receipt = await sell({
  chainId: 8453,
  address: '0x...token_address...',
  account: '0x...your_wallet...',
  slippage: 5,
  referrer: '0x...referrer_wallet...', // Referral fees go here
  amount: 5000,
});
```

### Higher Slippage for Volatile Tokens

```typescript
const receipt = await sell({
  chainId: 1, // Ethereum
  address: '0x...token_address...',
  account: '0x...your_wallet...',
  slippage: 10, // Higher tolerance for volatile tokens
  referrer: '0x0000000000000000000000000000000000000000',
  amount: 10000,
});
```

## Multi-Chain Support

The sell skill automatically handles different chains:

| Chain    | Chain ID | Block Explorer |
| -------- | -------- | -------------- |
| Ethereum | 1        | etherscan.io   |
| BSC      | 56       | bscscan.com    |
| Base     | 8453     | basescan.org   |

The `chainId` parameter determines which network the transaction is executed on. Ensure your `RPC_URL` supports the target chain.

## Gas Estimation

The skill automatically estimates gas before sending each transaction:

1. **Approve Transaction**: Estimates ERC20 `approve` gas cost
2. **Sell Transaction**: Estimates TradeFacet `sell` gas cost

Gas costs vary by network congestion and transaction complexity. Each transaction is estimated independently.

## Transaction Dependencies

The two transactions are **sequential and dependent**:

```
┌─────────────────┐      ┌─────────────────┐
│ 1. Approve      │ ───▶ │ 2. Sell         │
│    (ERC20)      │      │    (TradeFacet) │
└─────────────────┘      └─────────────────┘
```

- The sell transaction **cannot** execute until the approve transaction is confirmed
- If the approve fails, the sell will not be attempted
- Both must succeed for a complete sell operation

## Best Practices

1. **Check token balance** - Ensure you have enough tokens to sell
2. **Check approval** - If you've already approved the pool, the approve tx may still be required but will use minimal gas
3. **Monitor slippage** - Use lower slippage (1%) for stable tokens, higher (5-10%) for volatile launches
4. **Check pool liquidity** - Ensure the pool has sufficient liquidity to handle your sell
5. **Consider timing** - Large sells can impact token price; consider splitting into smaller chunks
6. **Verify addresses** - Double-check token addresses before selling (you're selling THIS token)
7. **Use referral codes** - Set a referrer to support community members

## Integration Notes

The sell function is designed to be used programmatically:

```typescript
// Import and call directly
import { sell } from './src/sell';

// Or run the self-executing script
// npx ts-node src/sell.ts
```

The self-executing async IIFE at the bottom of `sell.ts` demonstrates usage with hardcoded values for testing.

## Comparison with Buy

| Aspect              | Buy              | Sell                           |
| ------------------- | ---------------- | ------------------------------ |
| Transactions        | 1                | 2 (approve + sell)             |
| Value sent          | Yes (ETH/native) | No                             |
| Token flow          | Receive tokens   | Send tokens                    |
| Gas costs           | ~150k-300k       | ~100k (approve) + ~200k (sell) |
| Slippage protection | Yes              | Yes                            |
| Referral support    | Yes              | Yes                            |
