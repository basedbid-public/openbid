# Buy Token Skill

## Description

Buy tokens from a Liquidity Bootstrapping Pool (LBP) or a Flash Token on the based.bid platform. This skill handles token purchases with configurable slippage protection and referral tracking.

The buy functionality supports multiple EVM chains (Ethereum, BSC, Base) and interacts with the TradeFacet smart contract to execute token purchases. The skill obtains transaction data from the BasedBid API, estimates gas, and submits the transaction on-chain.

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

The `buy` function accepts a `BuyRequest` interface:

```typescript
interface BuyRequest {
  chainId: number; // 1 (Ethereum) | 56 (BSC) | 8453 (Base)
  address: string; // Token contract address (LBP/pool address)
  account: string; // Buyer's wallet address
  slippage: number; // 1 | 5 | 10 (percentage)
  referrer: string; // Referral address (use zero address for no referrer)
  amount: number; // Amount to buy (in native currency, e.g., ETH)
}
```

### Parameter Details

| Parameter  | Type     | Description                | Constraints                       |
| ---------- | -------- | -------------------------- | --------------------------------- |
| `chainId`  | `number` | Blockchain network ID      | Must be 1, 56, or 8453            |
| `address`  | `string` | Token/LBP contract address | Valid EVM address (0x...)         |
| `account`  | `string` | Buyer's wallet address     | Valid EVM address (0x...)         |
| `slippage` | `number` | Maximum allowed slippage   | Must be 1, 5, or 10 (percent)     |
| `referrer` | `string` | Referral wallet address    | Valid EVM address or zero address |
| `amount`   | `number` | Purchase amount            | Must be >= 0 (in native token)    |

## Configuration

The script reads configuration from environment variables (see `.env`):

| Variable      | Description                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `PRIVATE_KEY` | Wallet private key for signing transactions                                                      |
| `RPC_URL`     | RPC endpoint for blockchain communication (chain-agnostic URL that works on any supported chain) |

## Execution Flow

1. **Environment Validation** - Validates required environment variables (`PRIVATE_KEY`, `RPC_URL`)
2. **Input Validation** - Schema validation via `buyApiSchema` (Zod)
3. **API Request** - Payload sent to `${API_URL}/lbp-buy-preview` which returns:
   - Contract function name to call
   - Contract address
   - ABI-encoded arguments
   - Transaction value
   - Chain information
4. **RPC Initialization** - Creates public and wallet clients using `initRpcClients`
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
| `Invalid environment`    | Missing or invalid `.env` variables                                   | Check `PRIVATE_KEY` and `RPC_URL` are set correctly            |
| `Invalid EVM address`    | Malformed address in request                                          | Ensure all addresses are 42-character hex strings (0x...)      |
| `Buy LBP request failed` | API server error                                                      | Check API availability and network connectivity                |
| `Transaction reverted`   | On-chain failure (insufficient funds, slippage exceeded, pool paused) | Check wallet balance, increase slippage, or verify pool status |
| `Gas estimation failed`  | Contract call will fail                                               | Verify token address is correct and pool has liquidity         |

## Example Usage

### Basic Buy

```typescript
import { buy } from './src/buy';

const receipt = await buy({
  chainId: 8453, // Base
  address: '0x9851fe835121322a7f467e01CC6eb8217F342b1d',
  account: '0xC307eE0832c269d0F2A326Aa0b481b6FA032B262',
  slippage: 1,
  referrer: '0x0000000000000000000000000000000000000000',
  amount: 0.00001, // 0.00001 ETH
});

console.log('Transaction confirmed:', receipt.transactionHash);
```

### Buy with Referral

```typescript
const receipt = await buy({
  chainId: 8453,
  address: '0x...token_address...',
  account: '0x...your_wallet...',
  slippage: 5,
  referrer: '0x...referrer_wallet...', // Referral fees go here
  amount: 0.001,
});
```

### Higher Slippage for Volatile Pairs

```typescript
const receipt = await buy({
  chainId: 1, // Ethereum
  address: '0x...token_address...',
  account: '0x...your_wallet...',
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
| Base     | 8453     | basescan.org   |

The `chainId` parameter determines which network the transaction is executed on. Ensure your `RPC_URL` supports the target chain.

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
import { buy } from './src/buy';

// Or run the self-executing script
// npx ts-node src/buy.ts
```

The self-executing async IIFE at the bottom of `buy.ts` demonstrates usage with hardcoded values for testing.
