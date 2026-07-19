# create-board-solana

## Description

Create a custom board (whitelabel launchpad) on the based.bid platform. Boards allow you to create your own branded token launchpad where other users can launch their tokens under your board name.

When you create a board, you can:

- Set a custom title and description
- Upload a logo and banner
- Configure social links and privacy / join policy
- Have tokens launch under your board brand
- Earn fees from tokens launched on your board (LBP package fees + flash-token DEX volume cut)

## When to Use

Use this skill when:

- Creating a new board/category for organizing token sales
- Setting up a curated collection of tokens on Solana
- Wanting to establish a branded space for token launches
- Needing to configure board-specific fees, privacy, and socials

## Prerequisites

Before using this skill, ensure:

1. Environment variables are configured in `.env`:
   - `SOLANA_PRIVATE_KEY`: Your Solana wallet private key (base58 or hex format)
2. Logo and banner image files exist and are accessible

## Agent Behavior

When the user requests to create a board on Solana, collect these required inputs:

1. **title**: Board name (max 32 UTF-8 bytes)
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
- `fees`: exactly 3 per-package LBP fee tiers (omit for platform defaults)
- `chainId`: Default is Solana Devnet (`5011`); mainnet is `501`

**Confirmation:** Display board details and require user confirmation before creating.

### JSON Template

Generate this config, replacing the marked values with user input:

```json
{
  "isSandboxMode": true,
  "chainId": 5011,
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

Omit `fees` to use platform defaults (3 launch-package tiers). Profile fields (`socials`, `privacyMode`, etc.) are written into IPFS board metadata; the on-chain API payload (`/sol/apply-sub-board`) carries fees, seed, signer, and `metaData` URL.

**To execute:**

```bash
npm run solana:create-board -- solana-create-board <config_file> --dry-run
# Then run without --dry-run to execute
```

---

## Usage

### Basic Usage

```typescript
import { createSolanaBoard } from './src/scripts/solana/create-board';

const result = await createSolanaBoard({
  title: 'My Awesome Board',
  description: 'A curated collection of innovative tokens on Solana',
  logo: './path/to/logo.png',
  banner: './path/to/banner.png',
  flashLaunchFeePer: '40',
});

console.log('Transaction:', result.signature);
```

### Private Board with Socials

```typescript
const result = await createSolanaBoard({
  title: 'Premium Board',
  description: 'High-quality token launches only',
  logo: './path/to/logo.png',
  banner: './path/to/banner.png',
  flashLaunchFeePer: '1',
  website: 'https://www.based.bid/',
  telegram: 'https://t.me/basedbid',
  twitter: 'https://x.com/example',
  privacyMode: 'private',
  isPublicBoard: false,
  allowRequests: false,
  apiPackageIndex: 1,
});
```

### With Custom Fees

```typescript
const result = await createSolanaBoard({
  title: 'Custom Fee Board',
  description: 'Board with custom fee configuration',
  logo: './path/to/logo.png',
  banner: './path/to/banner.png',
  flashLaunchFeePer: '40',
  fees: [
    {
      listingFee: '0',
      listingReferralFee: '0',
      buyFeePer: '0.75',
      sellFeePer: '0.75',
      finalizeFeePer: '1',
      tradingFeeAfterLaunchPer: '50',
    },
    {
      listingFee: '0.5',
      listingReferralFee: '0',
      buyFeePer: '0.75',
      sellFeePer: '0.75',
      finalizeFeePer: '1',
      tradingFeeAfterLaunchPer: '50',
    },
    {
      listingFee: '1',
      listingReferralFee: '0',
      buyFeePer: '0.75',
      sellFeePer: '0.75',
      finalizeFeePer: '1',
      tradingFeeAfterLaunchPer: '50',
    },
  ],
});
```

## Input Parameters

### `CreateSolanaBoardSdk` Interface

| Parameter           | Type               | Required | Description                                                                                                                                       |
| ------------------- | ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`             | `string`           | Yes      | Board title (max 32 UTF-8 bytes)                                                                                                                  |
| `description`       | `string`           | Yes      | Board description (max 1000 characters)                                                                                                           |
| `logo`              | `string`           | Yes      | File path to logo image                                                                                                                           |
| `banner`            | `string`           | Yes      | File path to banner image                                                                                                                         |
| `flashLaunchFeePer` | `string`           | Yes      | Board cut (%) of DEX volume fees from flash tokens launched under this board (numeric string, e.g. `"0.001"` or `"1"`). Top-level, not in `fees`. |
| `fees`              | `BoardFeeSolana[]` | No       | Per launch-package fee schedule (exactly 3 tiers when set); omit to use defaults                                                                  |
| `website`           | `string`           | No       | Project website (https) or `""`                                                                                                                   |
| `telegram`          | `string`           | No       | `https://t.me/...` or `""`                                                                                                                        |
| `twitter`           | `string`           | No       | `https://x.com/...` or `""`                                                                                                                       |
| `gitbook`           | `string`           | No       | Docs URL or `""`                                                                                                                                  |
| `tiktok`            | `string`           | No       | TikTok profile URL or `""`                                                                                                                        |
| `youtube`           | `string`           | No       | YouTube URL or `""`                                                                                                                               |
| `privacyMode`       | `string`           | No       | `public` \| `private` \| `request_to_join` \| `limited_visibility` (default `public`)                                                             |
| `isPublicBoard`     | `boolean`          | No       | Publicly listed / discoverable (default `true`)                                                                                                   |
| `allowRequests`     | `boolean`          | No       | Allow join/launch requests (default `false`)                                                                                                      |
| `apiPackageIndex`   | `number`           | No       | Default package `0` \| `1` \| `2` (default `0`)                                                                                                   |
| `isAllowed`         | `boolean`          | No       | Whether the board accepts launches (default `true`)                                                                                               |

### `flashLaunchFeePer` (important)

This is **not** a one-time listing fee. It is the percentage of the **DEX trading volume fee stream** generated by flash-token projects launched through your board that is paid to the board owner.

- Applies to flash-token launches under the board
- Independent of the per-package `fees` array (listing / buy / sell / finalize / after-launch)
- Example: `"1"` → board earns 1% of those DEX volume fees; `"0.001"` → 0.001%

### Board profile / privacy

Profile fields are stored in **IPFS board metadata** (not on the `/sol/apply-sub-board` wire payload). The platform URL pattern is `https://based.bid/b/{title}` (or testnet when sandbox).

| `privacyMode`        | Meaning                                    |
| -------------------- | ------------------------------------------ |
| `public`             | Anyone can view and launch under the board |
| `request_to_join`    | Launches require board-owner approval      |
| `private`            | Closed board                               |
| `limited_visibility` | Restricted discovery / access              |

### `BoardFeeSolana` Interface (per launch package)

| Parameter                  | Type     | Description                                   |
| -------------------------- | -------- | --------------------------------------------- |
| `listingFee`               | `string` | One-time fee (%) to list under this board     |
| `listingReferralFee`       | `string` | Referral cut (%) of the listing fee           |
| `buyFeePer`                | `string` | Board fee (%) on each buy                     |
| `sellFeePer`               | `string` | Board fee (%) on each sell                    |
| `finalizeFeePer`           | `string` | Board fee (%) when an LBP finalizes/graduates |
| `tradingFeeAfterLaunchPer` | `string` | Board fee (%) on trades after launch          |

> `flashLaunchFeePer` is **not** part of this per-package object — set it once at the board root.

When `fees` is provided, it must be **exactly 3** entries (BASED, SUPER_BASED, ULTRA_BASED).

## API Endpoint

- **URL**: `https://cdn.based.bid/api/sol/apply-sub-board`
- **Method**: `POST`
- **Chain ID**: `5011` (Solana Devnet) or `501` (Solana Mainnet)

API body (built by the SDK): `chainId`, `signer`, `seed`, `metaData`, `flashLaunchFeePer`, `fees`, `isSandboxMode`.

## Response

The `/sol/apply-sub-board` endpoint returns a Solana transaction payload (`transaction`, `blockhash`, `lastValidBlockHeight`, optional `txCost`). It does **not** return `boardId` / `boardTitle` / `metadataUrl`.

After confirmation, `createSolanaBoard` returns:

```typescript
{
  signature: string; // Solana transaction signature
}
```

The script also prints `metadataUrl` (from the IPFS upload) and `basedBidUrl`.

## Process Flow

1. **Validation**: Validates input parameters using Zod schemas (`createSolanaBoardSdkSchema`)
2. **IPFS Upload**:
   - Uploads logo and banner images to IPFS
   - Builds metadata (title, socials, privacy flags, etc.) and uploads JSON
3. **API Call**: Validates and sends request to `/sol/apply-sub-board`
4. **Transaction Processing**:
   - Decodes base64 transaction from API response
   - Attaches blockhash lifetime
   - Signs transaction with user's keypair
   - Sends transaction to Solana RPC
5. **Confirmation**: Polls until transaction is finalized
6. **Return**: Returns transaction `signature`

## Error Handling

The skill will throw errors for:

- Invalid input parameters (validation failures)
- Missing environment variables
- Invalid social URLs / privacy mode
- IPFS upload failures
- API call failures
- Transaction submission failures
- Transaction confirmation timeouts (90 seconds)

## Related Skills

- `create-lbp-solana`: Create a token sale (LBP) on a Solana board
- `create-board`: Create a board on EVM chains (Ethereum, BSC, Base, Robinhood Chain)

## Example Integration

```typescript
import { createSolanaBoard } from './src/scripts/solana/create-board';

async function main() {
  try {
    const board = await createSolanaBoard({
      title: 'Solana Gems',
      description: 'Discover the next generation of Solana tokens',
      logo: './assets/placeholder.png',
      banner: './assets/placeholder_banner.png',
      flashLaunchFeePer: '40',
    });

    console.log(`Board created successfully!`);
    console.log(
      `Transaction: https://explorer.solana.com/tx/${board.signature}?cluster=devnet`,
    );
  } catch (error) {
    console.error('Failed to create board:', error);
  }
}

main();
```

## Metadata Structure

```json
{
  "title": "Solana Gems",
  "logo": "https://ipfs.based.bid/ipfs/bafy...",
  "banner": "https://ipfs.based.bid/ipfs/bafy...",
  "description": "Discover the next generation of Solana tokens",
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

## Sandbox Mode

Solana supports sandbox mode for testing. When `isSandboxMode: true` is passed:

- The transaction is submitted via **testnet.based.bid** instead of the mainnet based.bid app
- Operations execute against test infrastructure
- No real funds are used

```typescript
await createSolanaBoard({
  isSandboxMode: true, // Enable sandbox mode (uses testnet.based.bid)
  title: 'Test Board',
  description: 'A test board for sandbox',
  logo: './path/to/logo.png',
  banner: './path/to/banner.png',
  flashLaunchFeePer: '1',
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
