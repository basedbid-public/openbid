# create-board-solana

## Description

Create a custom board (whitelabel launchpad) on the based.bid platform. Boards allow you to create your own branded token launchpad where other users can launch their tokens under your board name.

When you create a board, you can:

- Set a custom title and description
- Upload a custom logo
- Have tokens launch under your board brand
- Earn fees from tokens launched on your board

## When to Use

Use this skill when:

- Creating a new board/category for organizing token sales
- Setting up a curated collection of tokens on Solana
- Wanting to establish a branded space for token launches
- Needing to configure board-specific fees and parameters

## Prerequisites

Before using this skill, ensure:

1. Environment variables are configured in `.env`:
   - `SOLANA_PRIVATE_KEY`: Your Solana wallet private key (base58 or hex format)
2. Logo image file exists and is accessible
3. (Optional) Banner image file if you want a banner

## Usage

### Basic Usage

```typescript
import { createBoardSolana } from './src/create-board-solana';

const result = await createBoardSolana({
  title: 'My Awesome Board',
  description: 'A curated collection of innovative tokens on Solana',
  logo: './path/to/logo.png',
});

console.log('Board created:', result.boardId);
console.log('Transaction:', result.signature);
```

### With Banner

```typescript
const result = await createBoardSolana({
  title: 'Premium Board',
  description: 'High-quality token launches only',
  logo: './path/to/logo.png',
  banner: './path/to/banner.png', // Optional
});
```

### With Custom Fees

```typescript
const result = await createBoardSolana({
  title: 'Custom Fee Board',
  description: 'Board with custom fee configuration',
  logo: './path/to/logo.png',
  fees: [
    {
      listingFee: 1000000000n, // 1 SOL in lamports
      listingReferralFee: 500000000n, // 0.5 SOL
      buyFeePer: 100, // 1% (100 basis points)
      sellFeePer: 100,
      finalizeFeePer: 50,
      flashLaunchFeePer: 200,
      tradingFeeAfterLaunchPer: 100,
      padding: 0,
    },
  ],
});
```

## Input Parameters

### `CreateBoardSolanaSdk` Interface

| Parameter     | Type               | Required | Description                             |
| ------------- | ------------------ | -------- | --------------------------------------- |
| `title`       | `string`           | Yes      | Board title (max 100 characters)        |
| `description` | `string`           | Yes      | Board description (max 1000 characters) |
| `logo`        | `string`           | Yes      | File path to logo image                 |
| `banner`      | `string`           | No       | File path to banner image               |
| `fees`        | `BoardFeeSolana[]` | No       | Array of fee configurations             |

### `BoardFeeSolana` Interface

| Parameter                  | Type     | Description                                    |
| -------------------------- | -------- | ---------------------------------------------- |
| `listingFee`               | `bigint` | Fee to list a token on the board (in lamports) |
| `listingReferralFee`       | `bigint` | Referral fee for listings                      |
| `buyFeePer`                | `number` | Buy fee percentage (basis points, 0-10000)     |
| `sellFeePer`               | `number` | Sell fee percentage (basis points, 0-10000)    |
| `finalizeFeePer`           | `number` | Finalize fee percentage                        |
| `flashLaunchFeePer`        | `number` | Flash launch fee percentage                    |
| `tradingFeeAfterLaunchPer` | `number` | Trading fee after launch                       |
| `padding`                  | `number` | Reserved padding (0-255)                       |

## API Endpoint

- **URL**: `https://cdn.based.bid/api/sol/apply-sub-board`
- **Method**: `POST`
- **Chain ID**: 5011 (Solana Devnet)

## Response

Returns an object with:

```typescript
{
  boardId: string; // Unique identifier for the board
  boardTitle: string; // The board title
  metadataUrl: string; // IPFS URL of the metadata
  signature: string; // Solana transaction signature
}
```

## Process Flow

1. **Validation**: Validates input parameters using Zod schemas
2. **IPFS Upload**:
   - Uploads logo image to IPFS
   - Uploads banner image to IPFS (if provided)
   - Uploads metadata JSON to IPFS
3. **API Call**: Sends request to `/sol/apply-sub-board` endpoint
4. **Transaction Processing**:
   - Decodes base64 transaction from API response
   - Attaches blockhash lifetime
   - Signs transaction with user's keypair
   - Sends transaction to Solana RPC
5. **Confirmation**: Polls until transaction is finalized
6. **Return**: Returns board ID and transaction details

## Error Handling

The skill will throw errors for:

- Invalid input parameters (validation failures)
- Missing environment variables
- IPFS upload failures
- API call failures
- Transaction submission failures
- Transaction confirmation timeouts (90 seconds)

## Files Generated

During execution, two debug files are created:

- `board-solana-api-payload.json`: The API request payload
- `board-solana-api-response.json`: The API response

## Related Skills

- `create-lbp-solana`: Create a token sale (LBP) on a Solana board
- `create-board`: Create a board on EVM chains (Ethereum, BSC, Base)

## Example Integration

```typescript
import { createBoardSolana } from './src/create-board-solana';

async function main() {
  try {
    const board = await createBoardSolana({
      title: 'Solana Gems',
      description: 'Discover the next generation of Solana tokens',
      logo: './assets/board-logo.png',
      banner: './assets/board-banner.png',
    });

    console.log(`✅ Board created successfully!`);
    console.log(`Board ID: ${board.boardId}`);
    console.log(
      `Transaction: https://explorer.solana.com/tx/${board.signature}?cluster=devnet`,
    );
  } catch (error) {
    console.error('Failed to create board:', error);
  }
}

main();
```

## Sandbox Mode

Solana supports sandbox mode for testing. When `isSandboxMode: true` is passed:

- The transaction is submitted via **testnet.based.bid** instead of the mainnet based.bid app
- Operations execute against test infrastructure
- No real funds are used

```typescript
await createBoardSolana({
  isSandboxMode: true,  // Enable sandbox mode (uses testnet.based.bid)
  title: 'Test Board',
  description: 'A test board for sandbox',
  logo: './path/to/logo.png',
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
