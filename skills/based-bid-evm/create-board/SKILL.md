# Create Board Skill

## Description

Create a custom board (whitelabel launchpad) on the based.bid platform. Boards allow you to create your own branded token launchpad where other users can launch their tokens under your board name.

When you create a board, you can:

- Set a custom title and description
- Upload a logo and banner
- Configure social links and privacy / join policy
- Have tokens launch under your board brand
- Earn fees from tokens launched on your board (LBP package fees + flash-token DEX volume cut)

## Key Concepts

- **Board Title**: Display name and identifier (max 48 characters)
- **Description**: Public description shown on the board page
- **Logo / Banner**: Visual branding (both required; stored on IPFS)
- **Profile**: Social links, privacy mode, public listing, join requests — written into IPFS metadata and the create-board API payload
- **Fees**: Top-level `flashLaunchFeePer` for flash-token DEX volume share; optional per-package `fees` for LBP-oriented cuts

## Agent Behavior

When the user requests to create a board, collect these required inputs:

1. **title**: Board name (1–48 characters)
2. **description**: Board description (1–1000 characters)
3. **logo**: Path to logo image file
4. **banner**: Path to banner image file
5. **flashLaunchFeePer**: Board cut (%) of flash-token DEX volume fees (numeric string, e.g. `"1"` or `"40"`)

**Optional:**

- Socials: `website`, `telegram`, `twitter`, `gitbook`, `tiktok`, `youtube` (https URLs, or `""`)
- `privacyMode`: `public` | `private` | `request_to_join` | `limited_visibility` (default `public`)
- `isPublicBoard`: whether the board is publicly listed (default `true`)
- `allowRequests`: whether users may request to join/launch (default `false`)
- `apiPackageIndex`: default launch package `0` | `1` | `2` (default `0`)
- `isAllowed`: whether the board accepts launches (default `true`)
- `fees`: per-package LBP fee schedule (omit for platform defaults)
- `chainId`: Default is Base (`8453`). Options: `1` (Ethereum), `56` (BSC), `8453` (Base), `4663` (Robinhood Chain)

**Confirmation:** Display board details and require user confirmation before creating.

### JSON Template

Generate this config, replacing the marked values with user input:

```json
{
  "isSandboxMode": true,
  "chainId": 8453,
  "title": "<USER_INPUT:title>",
  "description": "<USER_INPUT:description>",
  "logo": "<USER_INPUT:logo_path>",
  "banner": "<USER_INPUT:banner_path>",
  "website": "",
  "telegram": "",
  "twitter": "",
  "gitbook": "",
  "tiktok": "",
  "youtube": "",
  "isAllowed": true,
  "apiPackageIndex": 0,
  "privacyMode": "public",
  "isPublicBoard": true,
  "allowRequests": false,
  "flashLaunchFeePer": "40"
}
```

Omit `fees` to use platform defaults. To override LBP package fees, add a `fees` array (see Parameter Details).

**To execute:**

```bash
npm run evm:create-board -- evm-create-board <config_file> --dry-run
# Then run without --dry-run to execute
```

---

## Invocation

Run the create-board script directly using ts-node:

```bash
npx ts-node src/scripts/evm/create-board.ts
```

Or build and run:

```bash
npm run build && node dist/scripts/evm/create-board.js
```

## Parameters

The `createBoard` / `createEvmBoard` function accepts a `CreateEvmBoardSdk` type (inferred from `createEvmBoardSchema`):

```typescript
import { CreateEvmBoardSdk } from 'schema/board/evm/sdk';

// Schema definition:
// createEvmBoardSchema = z.object({
//   chainId: evmChainIdSchema,      // 1 | 56 | 8453 | 4663
//   title: z.string().min(1).max(48),
//   description: z.string().min(1).max(1000),
//   logo: z.string(),              // file path to logo image
//   banner: z.string(),            // file path to banner image
//   flashLaunchFeePer: flashLaunchFeePerSchema, // board cut of flash-token DEX volume fees
//   fees: boardFeeSchema.array().optional(),    // per-package LBP-oriented schedule
//   ...boardProfileSchema.shape,               // socials, privacy, package index
// })
```

### Parameter Details

| Parameter           | Type      | Description                | Constraints                                                          |
| ------------------- | --------- | -------------------------- | -------------------------------------------------------------------- |
| `chainId`           | `number`  | Blockchain network ID      | Must be `1`, `56`, `8453`, or `4663`                                 |
| `title`             | `string`  | Board display name         | Required, 1–48 characters                                            |
| `description`       | `string`  | Public board description   | Required, 1–1000 characters                                          |
| `logo`              | `string`  | File path to logo image    | Required, valid file path                                            |
| `banner`            | `string`  | File path to banner image  | Required, valid file path                                            |
| `flashLaunchFeePer` | `string`  | Flash DEX volume fee cut   | Required numeric string 0–100. See below.                            |
| `fees`              | `array`   | Per-package fee schedule   | Optional; omit for platform defaults. Does **not** include flash cut |
| `website`           | `string`  | Project website            | Optional https URL or `""`                                           |
| `telegram`          | `string`  | Telegram link              | Optional `https://t.me/...` or `""`                                  |
| `twitter`           | `string`  | X / Twitter link           | Optional `https://x.com/...` or `""`                                 |
| `gitbook`           | `string`  | Docs link                  | Optional https URL or `""`                                           |
| `tiktok`            | `string`  | TikTok profile             | Optional `https://www.tiktok.com/@...` or `""`                       |
| `youtube`           | `string`  | YouTube link               | Optional YouTube URL or `""`                                         |
| `privacyMode`       | `string`  | Visibility / join policy   | `public` \| `private` \| `request_to_join` \| `limited_visibility`   |
| `isPublicBoard`     | `boolean` | Publicly listed            | Default `true`                                                       |
| `allowRequests`     | `boolean` | Allow join/launch requests | Default `false` (typical with `request_to_join`)                     |
| `apiPackageIndex`   | `number`  | Default launch package     | `0` BASED, `1` SUPER_BASED, `2` ULTRA_BASED (default `0`)            |
| `isAllowed`         | `boolean` | Accepts launches           | Default `true`                                                       |

### `flashLaunchFeePer` (important)

Top-level field (not inside `fees`). It is the percentage of the **DEX trading volume fee stream** generated by flash-token projects launched through your board that is paid to the board owner.

- Not a one-time listing fee
- Independent of the per-package `fees` array (listing / buy / sell / finalize / after-launch)
- Example: `"1"` → board earns 1% of those DEX volume fees; `"0.001"` → 0.001%

### Board profile / privacy

| `privacyMode`        | Meaning                                    |
| -------------------- | ------------------------------------------ |
| `public`             | Anyone can view and launch under the board |
| `request_to_join`    | Launches require board-owner approval      |
| `private`            | Closed board                               |
| `limited_visibility` | Restricted discovery / access              |

Profile fields are stored in IPFS board metadata and sent on the `/create-board` API payload. The platform URL uses the title: `https://based.bid/b/{title}`.

### Per-package `fees` (optional)

Each entry (LBP-oriented) uses numeric **percentage strings**:

| Field                      | Description                                   |
| -------------------------- | --------------------------------------------- |
| `listingFee`               | One-time fee (%) to list under this board     |
| `listingReferralFee`       | Referral cut (%) of the listing fee           |
| `buyFeePer`                | Board fee (%) on each buy                     |
| `sellFeePer`               | Board fee (%) on each sell                    |
| `finalizeFeePer`           | Board fee (%) when an LBP finalizes/graduates |
| `tradingFeeAfterLaunchPer` | Board fee (%) on trades after LBP graduates   |

> `flashLaunchFeePer` is **not** part of this object — set it once at the board root, it applies to all packages

### Account (Automatic)

The `account` parameter is automatically derived from the `PRIVATE_KEY` environment variable using `privateKeyToAccount()`. You don't need to pass it manually - the script will extract the wallet address from your configured private key.

The account address is used to:

- Associate the board with your wallet
- Enable board ownership and management
- Link the board to your identity on the platform

## Configuration

The script reads configuration from environment variables (see `.env`):

| Variable      | Description                                                                  |
| ------------- | ---------------------------------------------------------------------------- |
| `PRIVATE_KEY` | Wallet private key for signing transactions and deriving the account address |

Additional components:

- **IPFS Upload**: Automatically uploads logo, banner, and metadata via `cdn.based.bid/api/upload`
- **API Endpoint**: Creates board via `cdn.based.bid/api/create-board`

## Execution Flow

1. **Environment Validation** - Validates required environment variables (`PRIVATE_KEY`)
2. **Account Derivation** - Derives wallet address from `PRIVATE_KEY` using `privateKeyToAccount()`
3. **Input Validation** - Schema validation via `createEvmBoardSchema` (Zod) from `schema/board/evm/sdk`
4. **Logo / Banner Upload** - Images uploaded to IPFS via `IpfsUpload.uploadImage()`
5. **Metadata Preparation** - Builds metadata JSON (title, images, description, socials, privacy flags)
6. **Metadata Upload** - Metadata JSON uploaded to IPFS via `IpfsUpload.uploadMetadata()`
7. **API Request** - Calls `${API_URL}/create-board` with board data including `chainId`, `account`, fees, and profile fields
8. **On-chain Tx** - Signs and sends the returned `applySubBoard` transaction
9. **Response** - Prints board address, signature, metadata URL, and `basedBidUrl`

## API Response

The BasedBid `/create-board` endpoint returns an `EvmApiResponse` used to submit the on-chain transaction. On success the script prints:

```typescript
{
  ok: true;
  network: string;
  boardAddress: string; // Contract / facet address from API
  signature: string; // Transaction hash
  metadataUrl: string; // Uploaded metadata URL
  basedBidUrl: string; // e.g. https://based.bid/b/{title}
}
```

## Using Your Board

Once created, your board **title** can be used when launching LBPs or Flash Tokens:

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

Tokens launched with your board identifier will appear under your board on the based.bid platform.

## Output

On success, the script outputs a structured result including network, board address, transaction hash, metadata URL, and `basedBidUrl` (`/b/{title}`).

## Error Handling

Common errors:

| Error                                    | Cause                         | Fix                                                                |
| ---------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `PRIVATE_KEY must not be empty`          | Missing or empty private key  | Add `PRIVATE_KEY` to `.env` file                                   |
| `Invalid environment`                    | Invalid environment variables | Check `.env` configuration                                         |
| `Invalid chainId`                        | Unsupported chain ID          | Use 1 (Ethereum), 56 (BSC), 8453 (Base), or 4663 (Robinhood Chain) |
| `Title is required`                      | Empty title                   | Provide a non-empty title                                          |
| `Title must be 48 characters or less`    | Title > 48 chars              | Shorten the title                                                  |
| `Description is required`                | Empty description             | Provide a non-empty description                                    |
| `Description too long`                   | Description > 1000 chars      | Shorten the description                                            |
| `Logo file path is required`             | Empty logo path               | Provide a valid file path                                          |
| `Banner file path is required`           | Empty banner path             | Provide a valid file path                                          |
| `IPFS Error - Image file not found`      | Image file doesn't exist      | Verify the file path is correct                                    |
| `IPFS Error - Image file too large`      | Image > 1MB                   | Use a smaller image (max 1MB)                                      |
| `IPFS Error - Failed to upload metadata` | Metadata upload failed        | Check network connectivity                                         |
| `BasedBid API Error`                     | API server error              | Check API availability                                             |

## Example Usage

### Basic Board Creation

```typescript
import { createEvmBoard } from './src/scripts/evm/create-board';

const board = await createEvmBoard({
  chainId: 8453, // Base Mainnet
  title: 'Meme Masters',
  description:
    'The best place to launch your meme tokens! Join our community of meme coin creators.',
  logo: './assets/placeholder.png',
  banner: './assets/placeholder_banner.png',
  flashLaunchFeePer: '40',
});
```

### Private Board with Socials

```typescript
const board = await createEvmBoard({
  chainId: 8453,
  title: 'DeFi Launchpad Pro',
  description: 'Professional token launches for serious DeFi projects.',
  logo: './assets/placeholder.png',
  banner: './assets/placeholder_banner.png',
  flashLaunchFeePer: '1',
  website: 'https://example.com',
  twitter: 'https://x.com/example',
  telegram: 'https://t.me/example',
  privacyMode: 'private',
  isPublicBoard: false,
  allowRequests: false,
  apiPackageIndex: 1,
});
```

## Logo Requirements

### File Specifications

| Property             | Requirement              |
| -------------------- | ------------------------ |
| **Format**           | PNG, JPG, JPEG, GIF      |
| **Max Size**         | 1MB                      |
| **Recommended Size** | 512x512px or 1024x1024px |
| **Aspect Ratio**     | 1:1 (square)             |

### Best Practices

- Use a clear, recognizable logo
- Ensure good contrast for visibility
- Keep file size under 1MB for fast loading
- Use square aspect ratio for consistent display

## Banner Requirements

### File Specifications

| Property             | Requirement                       |
| -------------------- | --------------------------------- |
| **Format**           | PNG, JPG, JPEG, GIF               |
| **Max Size**         | 1MB                               |
| **Recommended Size** | 1500x500px or similar wide format |
| **Aspect Ratio**     | 3:1 (wide banner)                 |

### Best Practices

- Use a wide/banner format image
- Keep text and important elements centered
- Ensure good contrast for visibility
- Keep file size under 1MB for fast loading

## Integration Notes

The board creation function is designed to be used programmatically via `createEvmBoard` from `src/scripts/evm/create-board.ts`.

## Comparison with Token Creation

| Aspect        | Create Board                   | Create LBP/Flash Token       |
| ------------- | ------------------------------ | ---------------------------- |
| Blockchain Tx | Yes (`applySubBoard`)          | Yes                          |
| IPFS Upload   | Yes (logo + banner + metadata) | Yes (logo + metadata)        |
| Gas Costs     | Variable (ETH/BNB)             | Variable (ETH/BNB)           |
| Transactions  | 1 API call + 1 blockchain tx   | 1 API call + 1 blockchain tx |
| Prerequisites | Wallet with funds              | Wallet with funds            |
| Result        | Board registered               | Token deployed               |

## Board Discovery

After creation, your board will be:

- Listed on the based.bid platform (when `isPublicBoard` is true)
- Accessible via URL: `https://based.bid/b/{title}`
- Usable as `boardTitle` / board identifier in token creation scripts

## Best Practices

1. **Choose a unique title** - Your board identity is your brand
2. **Write a compelling description** - Attract token creators to your board
3. **Use a professional logo and banner** - First impressions matter
4. **Set privacy intentionally** - `public` vs `private` / `request_to_join`
5. **Configure `flashLaunchFeePer` thoughtfully** - This is your flash-token volume share
6. **Promote your board** - Share your `/b/{title}` URL with potential token launchers

## Metadata Structure

The metadata JSON uploaded to IPFS follows this structure:

```json
{
  "title": "My Awesome Board",
  "logo": "https://ipfs.based.bid/ipfs/bafy...",
  "banner": "https://ipfs.based.bid/ipfs/bafy...",
  "description": "This is a description of my awesome token launch board...",
  "website": "",
  "telegram": "",
  "twitter": "",
  "gitbook": "",
  "tiktok": "",
  "youtube": "",
  "isAllowed": true,
  "apiPackageIndex": 0,
  "privacyMode": "public",
  "isPublicBoard": true,
  "allowRequests": false
}
```

This metadata is immutable once created (stored on IPFS), so choose your content carefully.

## Sandbox Mode

For EVM chains, `isSandboxMode` is accepted in the SDK schema but **has no effect** — all operations execute on mainnet of the target chain (Ethereum, BSC, Base, or Robinhood Chain). The parameter exists for API consistency with Solana workflows.

When using Solana, setting `isSandboxMode: true` routes to **testnet.based.bid** instead of the mainnet based.bid app, allowing experimentation without real funds. EVM always uses mainnet regardless of this setting.

```typescript
// isSandboxMode is accepted but ignored for EVM
await createEvmBoard({
  chainId: 8453,
  title: 'Test Board',
  description: 'Testing board creation',
  logo: './path/to/logo.png',
  banner: './path/to/banner.png',
  flashLaunchFeePer: '1',
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
