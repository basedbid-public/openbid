# Create Board Skill

## Description

Create a custom board (whitelabel launchpad) on the based.bid platform. Boards allow you to create your own branded token launchpad where other users can launch their tokens under your board name.

When you create a board, you can:
- Set a custom title and description
- Upload a custom logo
- Have tokens launch under your board brand
- Earn fees from tokens launched on your board

## Key Concepts

- **Board Title**: Unique identifier for your board (used when launching tokens)
- **Description**: Public description shown on the board page
- **Logo**: Visual branding for your board (displayed on the platform)
- **Metadata**: All board information stored on IPFS for decentralization

## Invocation

Run the create-board script directly using ts-node:

```bash
npx ts-node src/create-board.ts
```

Or build and run:

```bash
npm run build && node dist/create-board.js
```

## Parameters

The `createBoard` function accepts a `CreateBoardRequest` interface:

```typescript
interface CreateBoardRequest {
  chainId: number;      // Blockchain network ID (1=Ethereum, 56=BSC, 8453=Base)
  title: string;        // Board name/title (required, max 100 chars)
  description: string;  // Board description (required, max 1000 chars)
  logo: string;        // Path to logo image file (required)
  banner?: string;     // Path to banner image file (optional)
}
```

### Parameter Details

| Parameter | Type | Description | Constraints |
|-----------|------|-------------|-------------|
| `chainId` | `number` | Blockchain network ID | Must be 1 (Ethereum), 56 (BSC), or 8453 (Base) |
| `title` | `string` | Board name/title | Required, 1-100 characters |
| `description` | `string` | Public board description | Required, 1-1000 characters |
| `logo` | `string` | File path to logo image | Required, valid file path |
| `banner` | `string` | File path to banner image | Optional, valid file path |

### Account (Automatic)

The `account` parameter is automatically derived from the `PRIVATE_KEY` environment variable using `privateKeyToAccount()`. You don't need to pass it manually - the script will extract the wallet address from your configured private key.

The account address is used to:
- Associate the board with your wallet
- Enable board ownership and management
- Link the board to your identity on the platform

## Configuration

The script reads configuration from environment variables (see `.env`):

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Wallet private key for signing transactions and deriving the account address |
| `RPC_URL` | (Optional) RPC endpoint - currently not used for board creation but may be needed in future |

Additional components:

- **IPFS Upload**: Automatically uploads logo and metadata to IPFS via `cdn.based.bid/api/upload`
- **API Endpoint**: Creates board via `cdn.based.bid/api/create-board`

## Execution Flow

1. **Environment Validation** - Validates required environment variables (`PRIVATE_KEY`)
2. **Account Derivation** - Derives wallet address from `PRIVATE_KEY` using `privateKeyToAccount()`
3. **Input Validation** - Schema validation via `createBoardSchema` (Zod)
4. **Logo Upload** - Logo image uploaded to IPFS via `IpfsUpload.uploadImage()`
5. **Banner Upload** - Banner image uploaded to IPFS (if provided)
6. **Metadata Preparation** - Constructs metadata JSON with title, description, logo URL, and banner URL
7. **Metadata Upload** - Metadata JSON uploaded to IPFS via `IpfsUpload.uploadMetadata()`
8. **API Request** - Calls `${API_URL}/create-board` with board data including `chainId` and `account`
9. **Response** - Returns board ID, title, and IPFS URLs

## API Response

The BasedBid `/create-board` endpoint returns a `CreateBoardResponse`:

```typescript
interface CreateBoardResponse {
  ok: boolean;           // Success status
  boardId: string;      // Unique board identifier
  boardTitle: string;   // Board title (normalized)
  metadataUrl: string; // IPFS URL to board metadata
  logoUrl: string;    // IPFS URL to board logo
}
```

## Using Your Board

Once created, your board title can be used when launching LBPs or Flash Tokens:

```typescript
// In create-lbp.ts or create-flash-token.ts
const args = {
  token: {
    boardTitle: 'my-awesome-board', // Your board title
    // ... other params
  },
  // ...
};
```

Tokens launched with your `boardTitle` will appear under your board on the based.bid platform.

## Output

On success, the script outputs:

```
Creating board: My Awesome Board
Account: 0x...
Chain ID: 8453
Uploading logo to IPFS...
Logo uploaded: https://ipfs.based.bid/ipfs/...
Uploading metadata to IPFS...
Metadata uploaded: https://ipfs.based.bid/ipfs/...
Creating board via API...
Board created successfully!
Board ID: board_abc123
Board Title: my-awesome-board
Metadata URL: https://ipfs.based.bid/ipfs/...
Logo URL: https://ipfs.based.bid/ipfs/...
```

## Error Handling

Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `PRIVATE_KEY must not be empty` | Missing or empty private key | Add `PRIVATE_KEY` to `.env` file |
| `RPC_URL must not be empty` | Missing or empty RPC URL | Add `RPC_URL` to `.env` file |
| `Invalid environment` | Invalid environment variables | Check `.env` configuration |
| `Invalid chainId` | Unsupported chain ID | Use 1 (Ethereum), 56 (BSC), or 8453 (Base) |
| `Title is required` | Empty title | Provide a non-empty title |
| `Title too long` | Title > 100 chars | Shorten the title |
| `Description is required` | Empty description | Provide a non-empty description |
| `Description too long` | Description > 1000 chars | Shorten the description |
| `Logo file path is required` | Empty logo path | Provide a valid file path |
| `IPFS Error - Image file not found` | Logo file doesn't exist | Verify the file path is correct |
| `IPFS Error - Image file too large` | Logo > 1MB | Use a smaller image (max 1MB) |
| `IPFS Error - Failed to upload metadata` | Metadata upload failed | Check network connectivity |
| `BasedBid API Error` | API server error | Check API availability |

## Example Usage

### Basic Board Creation

```typescript
import { createBoard } from './src/create-board';

const board = await createBoard({
  chainId: 8453,  // Base Mainnet
  title: 'Meme Masters',
  description: 'The best place to launch your meme tokens! Join our community of meme coin creators.',
  logo: './assets/meme-masters-logo.png',
  banner: './assets/meme-masters-banner.png',  // Optional banner
});

console.log('Board created:', board.boardTitle);
console.log('Account:', board.account); // Derived from PRIVATE_KEY
```

### Custom Brand Board on Ethereum

```typescript
const board = await createBoard({
  chainId: 1,  // Ethereum Mainnet
  title: 'DeFi Launchpad Pro',
  description: 'Professional token launches for serious DeFi projects. We provide the tools and community you need to succeed.',
  logo: './assets/defi-logo.jpg',
  banner: './assets/defi-banner.jpg',
});
```

### Minimal Board on BSC

```typescript
const board = await createBoard({
  chainId: 56,  // BNB Smart Chain
  title: 'MyBoard',
  description: 'Launch your tokens here',
  logo: './logo.png',
});
```

## Logo Requirements

### File Specifications

| Property | Requirement |
|----------|-------------|
| **Format** | PNG, JPG, JPEG, GIF |
| **Max Size** | 1MB |
| **Recommended Size** | 512x512px or 1024x1024px |
| **Aspect Ratio** | 1:1 (square) |

### Best Practices

- Use a clear, recognizable logo
- Ensure good contrast for visibility
- Keep file size under 1MB for fast loading
- Use square aspect ratio for consistent display

## Banner Requirements (Optional)

### File Specifications

| Property | Requirement |
|----------|-------------|
| **Format** | PNG, JPG, JPEG, GIF |
| **Max Size** | 1MB |
| **Recommended Size** | 1500x500px or similar wide format |
| **Aspect Ratio** | 3:1 (wide banner) |

### Best Practices

- Use a wide/banner format image
- Keep text and important elements centered
- Ensure good contrast for visibility
- Keep file size under 1MB for fast loading

## Integration Notes

The board creation function is designed to be used programmatically:

```typescript
// Import and call directly
import { createBoard } from './src/create-board';

// Or run the self-executing script
// npx ts-node src/create-board.ts
```

The self-executing async IIFE at the bottom of `create-board.ts` demonstrates usage with example values for testing.

## Comparison with Token Creation

| Aspect | Create Board | Create LBP/Flash Token |
|--------|--------------|------------------------|
| Blockchain Tx | No | Yes |
| IPFS Upload | Yes (logo + metadata) | Yes (logo + metadata) |
| Gas Costs | None | Variable (ETH/BNB) |
| Transactions | 1 API call | 1 API call + 1 blockchain tx |
| Prerequisites | Wallet address (PRIVATE_KEY) | Wallet with funds |
| Result | Board registered | Token deployed |

## Board Discovery

After creation, your board will be:
- Listed on the based.bid platform
- Accessible via URL: `https://based.bid/board/{boardTitle}`
- Usable as `boardTitle` in token creation scripts

## Best Practices

1. **Choose a unique title** - Your board title is your brand
2. **Write a compelling description** - Attract token creators to your board
3. **Use a professional logo** - First impressions matter
4. **Keep metadata updated** - You may want to refresh your board info periodically
5. **Promote your board** - Share your board URL with potential token launchers
6. **Consider fees** - Research board owner fee structures on the platform

## Metadata Structure

The metadata JSON uploaded to IPFS follows this structure:

```json
{
  "title": "My Awesome Board",
  "description": "This is a description of my awesome token launch board...",
  "logo": "https://ipfs.based.bid/ipfs/bafy...",
  "banner": "https://ipfs.based.bid/ipfs/bafy..."
}
```

The `banner` field is optional and will only be present if a banner image was provided.

This metadata is immutable once created (stored on IPFS), so choose your content carefully.
