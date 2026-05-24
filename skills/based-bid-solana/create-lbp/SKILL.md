# Create LBP (Solana) Skill

## Description

Creates a Liquidity Bootstrapping Pool (LBP) / meme token launch on the **Solana** based.bid platform. This skill handles token metadata preparation, IPFS uploads, transaction building via the BasedBid API, signing with both the user wallet and a mint keypair, and optional fee-distribution registration.

Unlike the EVM flow, the Solana LBP creation involves:
- Generating a random numeric `seed` (embedded in metadata)
- Receiving a base64-encoded compiled transaction from the API
- Signing with **wallet first, then mint keypair** (order matters)
- Optional fee-distribution setup via a separate endpoint

## Invocation

```bash
npx ts-node src/scripts/solana/create-lbp.ts
```

Or build and run:

```bash
npm run build && node dist/scripts/solana/create-lbp.js
```

## Parameters

The `createLbpSolana` function accepts a `CreateSolanaLbpInput` type (inferred from `createSolanaLbpInputSchema`):

```typescript
import { CreateSolanaLbpInput } from 'schema/lbp/solana/sdk-input';
```

### Top-Level Fields

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `package` | `LaunchPackageType` | Yes | `BASED` (0), `SUPER_BASED` (1), or `ULTRA_BASED` (2) |
| `board` | `string` | No | **Optional.** Custom board title. Only include if user explicitly wants a custom board. |
| `boardOwner` | `string` | No | Board owner Solana address (required if `board` is set) |
| `token` | `object` | Yes | Token configuration (see below) |
| `sale` | `object` | No | Sale configuration (see below) |
| `dex` | `object` | Yes | DEX configuration (see below) |
| `fees` | `object` | No | Fee distribution configuration (see below) |

**Validation rule:** `board` and `boardOwner` must both be defined or both omitted.

> **Board behavior:** `board` is **purely optional**. Only include it if the user explicitly provides a custom board name they created via the create-board skill. Omitting it means the token launches without any board affiliation. **Do not send `'based'` or any default string unless the user explicitly requests it.**

### Token Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Token name (max 100 chars) |
| `symbol` | `string` | Yes | Token symbol (max 100 chars) |
| `totalSupply` | `string` | Yes | Total supply as numeric string |
| `decimals` | `number` | No | Defaults to `9` (Solana standard) |
| `initialBuyAmount` | `string` | Yes | Initial buy amount as numeric string (e.g. `'0'`) |
| `metadata` | `object` | Yes | Metadata (see below) |

### Token Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `logo` | `string` | Yes | File path to logo image |
| `twitter` | `string` | No | Valid Twitter/X URL (`https://x.com/...`) |
| `telegram` | `string` | No | Valid Telegram URL (`https://t.me/...`) |
| `website` | `string` | No | Valid website URL |
| `discord` | `string` | No | Valid Discord invite URL |
| `description` | `string` | No | Max 789 characters |

### Sale Configuration (optional)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `marketCap` | `string` | No | `'9000'` | Market cap as numeric string |
| `startTime` | `number` | Yes* | — | Unix timestamp (seconds) |
| `maxAllocationPerUser` | `string` | No | `'0'` | Max allocation per user |
| `softCap` | `string` | No | — | Soft cap amount (requires `endTime`) |
| `endTime` | `number` | No | — | Unix timestamp (required if `softCap` set) |
| `referrer` | `string` | No | zero address | Referrer Solana address |
| `whitelistedAddresses` | `string[]` | No | `[]` | Whitelisted wallet addresses |

**Validation:** `softCap` and `endTime` must both be defined together or both omitted.

### DEX Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `SolanaDexType` | Yes | `METEORA` or `RAYDIUM` |
| `feeTier` | `string` | Yes | Fee tier index as string |

### Fees Configuration (optional)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `buyPoolCreator` | `number` | No | Buy fee for pool creator (max 1%) |
| `sellPoolCreator` | `number` | No | Sell fee for pool creator (max 1%) |
| `buyReferral` | `number` | No | Buy referral fee (max 1%) |
| `graduation` | `number` | No | Graduation fee (max 2.5%) |
| `feeDistribution` | `boolean` | No | Enable fee distribution |
| `dynamicFee` | `boolean` | No | Enable dynamic fees |
| `liquidityPercent` | `number` | No | Liquidity allocation % |
| `buybackPercent` | `number` | No | Buyback allocation % |
| `rewardPercent` | `number` | No | Reward allocation % |
| `marketingPercent` | `number` | No | Marketing allocation % |
| `creatorPercent` | `number` | No | Creator allocation % |
| `marketingWalletAddress` | `string` | No | Required if `marketingPercent > 0` |
| `customFees` | `array` | No | Custom fee splits `{ percent, walletAddress, name }` |
| `collectQuoteThreshold` | `string` | No | Collection threshold |
| `collectBaseThreshold` | `string` | No | Collection threshold |
| `feeDistributionPayoutKind` | `string` | No | `'SOL'` or `'TOKEN'` |
| `feeDistributionPayoutCustomMint` | `string` | No | Custom payout mint address |
| `rewardToken` | `string` | No | Reward token mint (required if `rewardPercent > 0`) |
| `minTokenBalanceForDividends` | `string` | No | Min balance for dividends |

**Validation:** `liquidityPercent + buybackPercent + rewardPercent + marketingPercent + creatorPercent + sum(customFees.percent)` must equal `50`.

## Configuration

Environment variables (see `.env`):

| Variable | Description |
|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Solana wallet private key (base58 or hex) |
| `SOLANA_RPC_URL` | Solana RPC endpoint (devnet: `https://api.devnet.solana.com`) |

## Execution Flow

1. **Environment Validation** - Validates `SOLANA_PRIVATE_KEY` and `SOLANA_RPC_URL`
2. **Input Validation** - `SolanaLbpValidator.validateInput(args)` with Zod schema
3. **Solana Wrapper Init** - Creates RPC connection and signer from `SOLANA_PRIVATE_KEY`
4. **Logo Upload** - Uploads logo to IPFS via `IpfsUpload.uploadImage()`
5. **Seed Generation** - Generates a 5-digit numeric seed for metadata uniqueness
6. **Metadata Preparation** - Builds metadata JSON with token info, social links, whitelist, and seed. `board` and `boardOwner` are only included if the user explicitly provided them.
7. **Metadata Upload** - Uploads metadata to IPFS via `IpfsUpload.uploadMetadata()`
8. **API Request** - Payload sent to `${API_URL}/sol/create-lbp`:
   - `package` mapped to numeric index via `getLaunchPackageIndex()`
   - `dex.routerId` set to DEX version
   - `dex.meteoraFeeTierIndex` or `dex.raydiumFeeTierIndex` depending on DEX
   - `sale.baseTokenForPair` and `sale.baseTokenDecimals` set to constants
9. **Transaction Processing**:
   - Decodes base64 `transaction` from API response
   - Reconstructs mint signer from `mintSignerSecretHex` (first 32 bytes = ed25519 private key)
   - Signs with **wallet first, then mint keypair** (critical order!)
   - Sends transaction via Solana RPC
10. **Confirmation** - Polls `getSignatureStatuses` until finalized
11. **Fee Distribution** (optional) - If `fees.feeDistribution` is true, calls separate `testnet.based.bid/api/token/fee-distribution` endpoint

## API Response

The `/sol/create-lbp` endpoint returns a `CreateLbpSolanaApiResponse`:

```typescript
interface CreateLbpSolanaApiResponse {
  ok: boolean;
  chainId: number;              // 5011 (devnet)
  chainSymbol: string;          // "SOL"
  transaction: string;          // base64-encoded compiled VersionedTransaction
  mintAddress: string;          // Token mint address
  mintSignerSecretHex: string;  // 128 hex chars (first 32 bytes = ed25519 priv key)
  lookupTableAddresses?: string[];
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote: string;
  metadataUrl: string;
}
```

## Output

On success, the script outputs:

- Transaction signature
- Mint address
- Explorer URL (devnet)

## Example Usage

### Basic LBP on Meteora

```typescript
import { createLbpSolana } from './src/scripts/solana/create-lbp';
import { LaunchPackageType } from '@enums/launch-package.type';
import { SolanaDexType } from '@enums/solana/dex.type';

await createLbpSolana({
  token: {
    name: 'My Token',
    symbol: 'MTK',
    totalSupply: '100000000',
    initialBuyAmount: '0',
    metadata: {
      logo: './assets/logo.png',
      twitter: 'https://x.com/mytoken',
      telegram: 'https://t.me/mytoken',
      website: 'https://mytoken.com',
      description: 'The best token on Solana',
    },
  },
  package: LaunchPackageType.BASED,
  dex: {
    version: SolanaDexType.METEORA,
    feeTier: '1',
  },
});
```

### LBP with Soft Cap and Fees

```typescript
await createLbpSolana({
  token: {
    name: 'Premium Token',
    symbol: 'PRM',
    totalSupply: '1000000000',
    initialBuyAmount: '1000',
    metadata: {
      logo: './assets/logo.png',
      description: 'A premium Solana token',
    },
  },
  package: LaunchPackageType.SUPER_BASED,
  board: 'my-awesome-board',
  boardOwner: 'your_wallet_address',
  dex: {
    version: SolanaDexType.RAYDIUM,
    feeTier: '2',
  },
  sale: {
    marketCap: '50000',
    startTime: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    maxAllocationPerUser: '5',
    softCap: '10000',
    endTime: Math.floor(Date.now() / 1000) + 25 * 60 * 60, // 25 hours from now
    whitelistedAddresses: ['whitelist_wallet_1', 'whitelist_wallet_2'],
  },
  fees: {
    buyPoolCreator: 0.005,
    sellPoolCreator: 0.005,
    buyReferral: 0.005,
    graduation: 0.01,
    feeDistribution: true,
    liquidityPercent: 10,
    buybackPercent: 10,
    rewardPercent: 10,
    marketingPercent: 10,
    creatorPercent: 10,
    marketingWalletAddress: 'marketing_wallet_address',
    customFees: [
      { percent: 5, walletAddress: 'kol_wallet', name: 'KOL Partner' },
      { percent: 5, walletAddress: 'team_wallet', name: 'Team' },
    ],
    collectQuoteThreshold: '1000',
    collectBaseThreshold: '1000',
    rewardToken: 'reward_token_mint',
    minTokenBalanceForDividends: '100',
  },
});
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid input arguments` | Zod schema validation failed | Check all required fields and constraints |
| `Failed to create LBP on Solana` | API error | Check API availability and network |
| `board and boardOwner must both be defined` | Only one of them provided | Provide both or neither |
| `endTime is required when softCap is defined` | Missing `endTime` with `softCap` | Add `endTime` or remove `softCap` |
| `marketingWalletAddress is required` | `marketingPercent > 0` but no wallet | Add `marketingWalletAddress` |
| `rewardToken is required` | `rewardPercent > 0` but no token | Add `rewardToken` |
| `percentages must equal 50` | Fee percents don't sum to 50 | Adjust percentages |
| `Transaction failed` | On-chain failure | Check wallet has SOL for fees, verify params |

## Key Differences from EVM LBP

| Aspect | EVM | Solana |
|--------|-----|--------|
| Chain ID | 1 / 56 / 8453 | 5011 (devnet) |
| Transaction type | ABI-encoded contract call | Base64 compiled VersionedTransaction |
| Signers | Single wallet | Wallet + mint keypair (order matters!) |
| Seed | N/A | 5-digit numeric seed in metadata |
| Fee distribution | Included in create payload | Separate API endpoint after creation |
| DEX config | `version` + `feeTier` | `routerId` + `meteoraFeeTierIndex` / `raydiumFeeTierIndex` |

## Best Practices

1. **Always test on devnet first** - Solana LBPs are irreversible on mainnet
2. **Save the mint address** - You'll need it for fee distribution and token management
3. **Use unique seeds** - The seed ensures metadata uniqueness
4. **Sign in correct order** - Wallet first, then mint keypair
5. **Consider soft cap carefully** - Set realistic goals and end times
6. **Validate fee percentages** - Must sum to exactly 50%
7. **Whitelist thoughtfully** - Add addresses before launch to prevent sniping
