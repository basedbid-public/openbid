# Create Flash Token (Solana) Skill

## Description

Creates a Flash Token on the **Solana** based.bid platform. Flash tokens launch immediately with liquidity available on the DEX (no bonding curve, no sale period). This is a faster alternative to LBP launches.

Unlike the EVM flash token flow, the Solana version requires **two sequential transactions**:
1. **TX1** — Creates the token mint and initial pool state
2. **TX2** — Finalizes the pool and enables trading

Both transactions are base64-encoded compiled VersionedTransactions returned by the API, signed with wallet + mint keypairs, and broadcast on Solana devnet.

## Invocation

```bash
npx ts-node src/scripts/solana/create-flash-token.ts
```

Or build and run:

```bash
npm run build && node dist/scripts/solana/create-flash-token.js
```

## Parameters

The `createFlashTokenSolana` function accepts a `CreateSolanaFlashInput` type (inferred from `createSolanaFlashInputSchema`):

```typescript
import { CreateSolanaFlashInput } from 'schema/flash-token/solana/sdk';
```

### Top-Level Fields

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flashDex` | `SolanaDexType` | Yes | `METEORA` or `RAYDIUM` |
| `board` | `string` | No | Board title (omit for default `based` board) |
| `boardOwner` | `string` | No | Board owner address (required if `board` set) |
| `token` | `object` | Yes | Token configuration (see below) |
| `raydium` | `object` | Yes* | Raydium-specific config (see below) |
| `meteora` | `object` | Yes* | Meteora-specific config (see below) |

**Validation rules:**
- `flashDex === RAYDIUM` → `raydium` must be defined, `meteora` ignored
- `flashDex === METEORA` → `meteora` must be defined, `raydium` ignored
- `board` and `boardOwner` must both be defined or both omitted

### Token Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Token name (max 100 chars) |
| `symbol` | `string` | Yes | Token symbol (max 100 chars) |
| `totalSupply` | `string` | Yes | Total supply as numeric string |
| `decimals` | `number` | No | Defaults to `9` (Solana standard) |
| `metadata` | `object` | Yes | Metadata (see below) |

### Token Metadata

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `logo` | `string` | Yes | File path to logo image |
| `twitter` | `string` | No | Valid Twitter/X URL |
| `telegram` | `string` | No | Valid Telegram URL |
| `website` | `string` | No | Valid website URL |
| `discord` | `string` | No | Valid Discord invite URL |
| `description` | `string` | No | Max 789 characters |

### Raydium Configuration (when `flashDex === RAYDIUM`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `feeTierIndex` | `string` | Yes | Raydium fee tier index |
| `finalStartPrice` | `number` | Yes | Final starting price (positive) |
| `hasInitialSwap` | `boolean` | Yes | Whether to perform initial swap |
| `solanaInitialBuyHuman` | `string` | Yes | Initial buy amount as string |

### Meteora Configuration (when `flashDex === METEORA`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `virtualUsd` | `number` | Yes | Virtual USD value (positive) |
| `nativeSolPriceUsd` | `number` | Yes | Native SOL price in USD (positive) |
| `feeTierIndex` | `string` | Yes | Meteora fee tier index |
| `hasHookDynamicFee` | `boolean` | Yes | Enable dynamic fee hook |
| `boardSeed` | `string` | No | Board seed string |

## Configuration

Environment variables (see `.env`):

| Variable | Description |
|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Solana wallet private key (base58 or hex) |
| `SOLANA_RPC_URL` | Solana RPC endpoint (devnet: `https://api.devnet.solana.com`) |

## Execution Flow

1. **Environment Validation** - Validates `SOLANA_PRIVATE_KEY` and `SOLANA_RPC_URL`
2. **Input Validation** - `SolanaFlashValidator.validateInput(args)` with Zod schema
3. **Solana Wrapper Init** - Creates RPC connection and signer
4. **Logo Upload** - Uploads logo to IPFS via `IpfsUpload.uploadImage()`
5. **Metadata Preparation** - Builds metadata JSON with token info, social links, board, boardOwner
6. **Metadata Upload** - Uploads metadata to IPFS via `IpfsUpload.uploadMetadata()`

### Transaction 1 (TX1)

7. **API Request** — Payload sent to `${API_URL}/sol/create-flash-tx1`:
   - `flashDex` mapped to `1` (Meteora) or `2` (Raydium)
   - DEX-specific fields included conditionally
8. **Transaction Processing**:
   - Decodes base64 `transaction` from API
   - Reconstructs mint signer from `mintSignerSecretHex` (first 32 bytes = ed25519 private key)
   - Signs with **wallet + mint keypair**
   - Sends via Solana RPC
9. **Confirmation** — Polls until finalized

### Transaction 2 (TX2)

10. **API Request** — Payload sent to `${API_URL}/sol/create-flash-tx2`:
    - Includes `tx1Signature` from previous step
    - Includes `flashSeed` and `mintAddress` from TX1 response
    - DEX-specific fields included conditionally
11. **Transaction Processing**:
    - Decodes base64 `transaction` from API
    - For Raydium: may include `positionNftSignerSecretHex` for position NFT signing
    - Signs with wallet (+ position NFT keypair if applicable)
    - Sends via Solana RPC
12. **Confirmation** — Polls until finalized

## API Responses

### TX1 Response (`CreateSolanaFlashTx1ApiResponse`)

```typescript
interface CreateSolanaFlashTx1ApiResponse {
  ok: boolean;
  chainId: number;              // 5011
  chainSymbol: string;
  transaction: string;          // base64-encoded compiled VersionedTransaction
  mintAddress: string;          // Token mint address
  mintSignerSecretHex: string;  // 128 hex chars (first 32 bytes = ed25519 priv key)
  flashSeed: string;
  flashDex?: number;
  meteoraTokenAccountSeed?: string;
  positionNftMintAddress?: string;
  positionNftSignerSecretHex?: string;
  lookupTableAddresses?: string[];
  blockhash: string;
  lastValidBlockHeight: number;
  note?: string;
  signingNote?: string;
  metadataUrl?: string;
  vanityLifecycle?: string;
}
```

### TX2 Response (`CreateSolanaFlashTxApiResponse`)

```typescript
interface CreateSolanaFlashTxApiResponse {
  ok: boolean;
  chainId: number;
  chainSymbol: string;
  transaction: string;
  mintAddress: string;
  mintSignerSecretHex: string;
  flashSeed: string;
  flashDex?: number;
  positionNftMintAddress?: string;
  positionNftSignerSecretHex?: string;
  tokenAccountSeedForRaydium?: string;
  lookupTableAddresses?: string[];
  blockhash: string;
  lastValidBlockHeight: number;
  signingNote?: string;
}
```

## Output

On success, returns:

```typescript
{
  mintAddress: string;              // Token mint address
  tx1Signature: string;            // TX1 transaction signature
  tx2Signature: string;            // TX2 transaction signature
  metadataUrl: string;             // IPFS metadata URL
  meteoraTokenAccountSeed?: string; // Meteora-specific seed
  positionNftMintAddress?: string; // Raydium position NFT address
}
```

## Example Usage

### Raydium Flash Token

```typescript
import { createFlashTokenSolana } from './src/scripts/solana/create-flash-token';
import { SolanaDexType } from '@enums/solana/dex.type';

const result = await createFlashTokenSolana({
  flashDex: SolanaDexType.RAYDIUM,
  token: {
    name: 'Flash Token',
    symbol: 'FLASH',
    totalSupply: '1000000000',
    decimals: 9,
    metadata: {
      logo: './assets/logo.png',
      twitter: 'https://x.com/flash-token',
      telegram: 'https://t.me/flash-token',
      description: 'The fastest token on Solana',
    },
  },
  raydium: {
    feeTierIndex: '0',
    finalStartPrice: 100,
    hasInitialSwap: false,
    solanaInitialBuyHuman: '0.1',
  },
});

console.log('Mint address:', result.mintAddress);
console.log('TX1:', result.tx1Signature);
console.log('TX2:', result.tx2Signature);
```

### Meteora Flash Token

```typescript
const result = await createFlashTokenSolana({
  flashDex: SolanaDexType.METEORA,
  board: 'my-awesome-board',
  boardOwner: 'your_wallet_address',
  token: {
    name: 'Meteora Flash',
    symbol: 'MFLASH',
    totalSupply: '500000000',
    decimals: 9,
    metadata: {
      logo: './assets/logo.png',
      description: 'A Meteora flash token',
    },
  },
  meteora: {
    virtualUsd: 1000,
    nativeSolPriceUsd: 150,
    feeTierIndex: '1',
    hasHookDynamicFee: true,
    boardSeed: '12345',
  },
});
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid input arguments` | Zod schema validation failed | Check all required fields per chosen DEX |
| `Raydium or Meteora parameters must be provided` | Missing DEX-specific config | Add `raydium` or `meteora` object matching `flashDex` |
| `board and boardOwner must both be defined` | Only one of them provided | Provide both or neither |
| `Failed to create flash token Transaction 1` | API error for TX1 | Check API availability and network |
| `Failed to create flash token Transaction 2` | API error for TX2 | Verify TX1 succeeded and params are correct |
| `Transaction failed` | On-chain failure | Check wallet has SOL, verify DEX-specific params |

## Key Differences from EVM Flash Token

| Aspect | EVM | Solana |
|--------|-----|--------|
| Transactions | 1 API call + 1 on-chain tx | 2 sequential API calls + 2 on-chain txs |
| Transaction type | ABI-encoded contract call | Base64 compiled VersionedTransaction |
| Signers | Single wallet | Wallet + mint keypair (+ position NFT keypair for Raydium TX2) |
| DEX config | `version` + `feeTier` | DEX-specific objects (`raydium` or `meteora`) |
| Chain ID | 1 / 56 / 8453 | 5011 (devnet) |

## Key Differences from Solana LBP

| Aspect | Solana LBP | Solana Flash Token |
|--------|------------|-------------------|
| Sale period | Yes (with price discovery) | No (instant liquidity) |
| Transactions | 1 create tx + optional fee distribution | 2 sequential txs (TX1 + TX2) |
| Seed | 5-digit numeric seed | `flashSeed` from TX1 response |
| DEX support | Meteora, Raydium | Meteora, Raydium |

## Best Practices

1. **Choose DEX carefully** — Raydium and Meteora have different config requirements
2. **Save TX1 response** — You'll need `tx1Signature`, `flashSeed`, and `mintAddress` for TX2
3. **Ensure SOL balance** — Two transactions means double the SOL for fees
4. **Test on devnet first** — Flash tokens are irreversible on mainnet
5. **Use correct signers** — Wallet first, then mint keypair (and position NFT keypair for Raydium TX2)
6. **Validate fee tiers** — Check DEX documentation for valid `feeTierIndex` values
