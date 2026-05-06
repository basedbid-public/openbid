# OpenBid

A TypeScript SDK for interacting with the [BasedBid](https://based.bid) platform - a decentralized token launchpad for creating and trading meme tokens on EVM chains.

## Overview

OpenBid provides a programmatic interface for:

- **Creating Boards** - Set up custom whitelabel launchpads for token launches
- **Creating Liquidity Bootstrapping Pools (LBP)** - Launch tokens with bonding curve mechanics
- **Creating Flash Tokens** - Instant token launches with advanced protection features (MEV, snipe, cooldown)
- **Buying tokens** - Purchase tokens from LBPs and liquidity pools
- **Selling tokens** - Sell tokens back to pools

## Features

### Token Launch Capabilities

- **Board Creation**: Create custom whitelabel launchpads for other users to launch tokens
- **Multi-chain support**: Ethereum, BSC, and Base
- **Multiple DEX versions**: Uniswap V3/V4, PancakeSwap V3/V4
- **Fee Builder (V4)**: Advanced fee routing with protection mechanisms
  - Dynamic fees (volatility-based)
  - Cooldown protection
  - Snipe protection
  - MEV protection
  - Tiered fees
- **IPFS Integration**: Automatic logo and metadata uploads
- **Whitelabel support**: Launch under any custom board on BasedBid

### Security & Protection

- Environment variable validation with Zod schemas
- Gas estimation before transaction execution
- Transaction confirmation tracking
- Comprehensive error handling

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
PRIVATE_KEY=your_wallet_private_key
RPC_URL=your_chain_agnostic_rpc_endpoint
```

### Supported Chains

| Chain ID | Network          |
| -------- | ---------------- |
| 1        | Ethereum Mainnet |
| 56       | BNB Smart Chain  |
| 8453     | Base Mainnet     |

## Usage

### Creating a Board

Create a custom board (whitelabel launchpad) for other users to launch tokens under your brand. The account address is automatically derived from your `PRIVATE_KEY` environment variable.

```typescript
import { createBoard } from './src/create-board';

const board = await createBoard({
  chainId: 8453,  // Base Mainnet (1=Ethereum, 56=BSC, 8453=Base)
  title: 'My Awesome Board',
  description: 'Launch your tokens on my custom board!',
  logo: './assets/my-logo.png',  // Path to logo image file
});

console.log('Board created:', board.boardTitle);
```

Run the script:

```bash
npx ts-node src/create-board.ts
```

See [Create Board Skill](skills/based-bid-create-board/SKILL.md) for detailed documentation.

### Creating an LBP (Liquidity Bootstrapping Pool)

```typescript
import { createLbp } from './src/create-lbp';
import { EvmDexType } from './src/enums/evm';
import { LaunchPackageType } from './src/enums/launch-package.type';

const args = {
  chainId: 8453, // Base
  package: LaunchPackageType.BASED,
  token: {
    name: 'My Token',
    symbol: 'MTK',
    totalSupply: 1_000_000_000,
    initialBuyAmount: 0,
    marketCap: 10_000,
    boardTitle: 'based',
    metadata: {
      logo: './logo.png',
      twitter: 'https://x.com/mytoken',
      telegram: 'https://t.me/mytoken',
      website: 'https://mytoken.com',
      description: 'The next generation meme token',
    },
  },
  dex: {
    version: EvmDexType.UNISWAP_V4,
    feeTier: 3, // 0.3% for V4 (can be 1-10%)
  },
  fees: {
    buyPoolCreator: 0.01, // 1%
    sellPoolCreator: 0.01, // 1%
    buyReferral: 0.01, // 1%
    graduation: 0.025, // 2.5%
    v4: {
      liquidity: 1,
      buyback: 1,
      feeThreshold: 0.1,
      tieredFeesEnabled: false,
      dynamicFees: {
        hasHookDynamicFee: true,
        volatilityDecayPeriod: 'MEDIUM',
        volatilityMultiplier: 'MEDIUM',
        volatilityTrigger: 'PER_BLOCK',
      },
      cooldownProtection: {
        cooldownDuration: 'MEDIUM',
        penaltyFee: 'MEDIUM',
      },
      snipeProtection: {
        maxBuyPerOrigin: 'MEDIUM',
        protectPeriod: 'MEDIUM',
      },
      mevProtectionEnabled: true,
      customWallets: [],
    },
  },
  sale: {
    startTime: Math.floor(Date.now() / 1000),
    maxAllocationPerUser: 0,
    maxAllocationPerWhitelistedUser: 0,
    whitelistedAddresses: [],
  },
};

await createLbp(args);
```

Run the script:

```bash
npx ts-node src/create-lbp.ts
```

### Creating a Flash Token

Flash tokens are instant-launched tokens with advanced protection:

```typescript
import { createFlashToken } from './src/test-buy';

await createFlashToken('Token Name', 'SYMBOL');
```

### Buying Tokens

Purchase tokens from LBPs or existing liquidity pools with configurable slippage protection.

```typescript
import { buy } from './src/buy';

const receipt = await buy({
  chainId: 8453,
  address: '0x...token_contract_address...',
  account: '0x...your_wallet_address...',
  slippage: 1, // 1% slippage tolerance (1, 5, or 10)
  referrer: '0x0000000000000000000000000000000000000000', // or referral address
  amount: 0.00001, // Amount to buy (in native currency)
});
```

Run the script:

```bash
npx ts-node src/buy.ts
```

See [Buy Token Skill](skills/based-bid-buy/SKILL.md) for detailed documentation.

### Selling Tokens

Sell tokens from LBPs or liquidity pools back to the pool (requires 2 transactions: approve + sell).

```typescript
import { sell } from './src/sell';

const receipt = await sell({
  chainId: 8453,
  address: '0x...token_contract_address...',  // Token you're selling
  account: '0x...your_wallet_address...',
  slippage: 1,  // 1% slippage tolerance (1, 5, or 10)
  referrer: '0x0000000000000000000000000000000000000000',  // or referral address
  amount: 1000,  // Amount of tokens to sell
});
```

Run the script:

```bash
npx ts-node src/sell.ts
```

See [Sell Token Skill](skills/based-bid-sell/SKILL.md) for detailed documentation.

## Project Structure

```
openbid/
├── src/
│   ├── buy.ts                    # Buy tokens from LBP/pools
│   ├── sell.ts                   # Sell tokens
│   ├── create-board.ts           # Create custom launchpad boards
│   ├── create-lbp.ts             # Create LBP token launch
│   ├── create-flash-token.ts     # Create flash token launch
│   ├── test-buy.ts               # Flash token creation utilities
│   ├── constants/
│   │   ├── abi/                  # Smart contract ABIs
│   │   ├── api-url.ts            # BasedBid API endpoint
│   │   └── chain-config.ts       # Chain configurations
│   ├── enums/
│   │   ├── evm/                  # EVM-related enums (DEX types)
│   │   ├── fee-builder/          # Fee builder option enums
│   │   └── launch-package.type.ts # Launch package tiers
│   ├── interfaces/
│   │   ├── board/                # Board creation interfaces
│   │   ├── buy/                  # Buy request/response interfaces
│   │   ├── sell/                 # Sell request/response interfaces
│   │   ├── lbp/                  # LBP-related interfaces
│   │   ├── flash-token/          # Flash token interfaces
│   │   └── ipfs/                 # IPFS upload interfaces
│   ├── schema/
│   │   ├── board/                # Board creation schemas
│   │   ├── buy/                  # Buy request schemas
│   │   ├── sell/                 # Sell request schemas
│   │   ├── lbp/                  # LBP validation schemas
│   │   ├── flash-token/          # Flash token schemas
│   │   └── environment.ts        # Environment variable schema
│   ├── types/
│   │   ├── chain-id.ts           # Chain ID type definitions
│   │   └── send-contract-parameters.ts
│   └── utils/
│       ├── based-bid-api.ts      # API request wrapper
│       ├── init-wallet.ts        # Wallet/client initialization
│       ├── ipfs-upload.ts        # IPFS upload utilities
│       ├── normalize-abi.ts      # ABI argument normalization
│       └── send-transaction.ts   # Transaction sender
├── skills/
│   ├── based-bid-buy/            # Buy tokens skill documentation
│   ├── based-bid-sell/           # Sell tokens skill documentation
│   ├── based-bid-create-board/   # Board creation skill documentation
│   ├── based-bid-create-lbp/     # LBP creation skill documentation
│   └── based-bid-create-flash-token/ # Flash token skill
├── ecosystem.config.js           # PM2 process configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Skills

Detailed skill documentation is available in the `skills/` directory:

| Skill | Description | Documentation |
|-------|-------------|---------------|
| **Create Board** | Create custom whitelabel launchpads | [SKILL.md](skills/based-bid-create-board/SKILL.md) |
| **Buy** | Purchase tokens from LBPs and pools | [SKILL.md](skills/based-bid-buy/SKILL.md) |
| **Sell** | Sell tokens back to LBPs and pools (2-step: approve + sell) | [SKILL.md](skills/based-bid-sell/SKILL.md) |
| **Create LBP** | Launch tokens with Liquidity Bootstrapping Pools | [SKILL.md](skills/based-bid-create-lbp/SKILL.md) |
| **Create Flash Token** | Instant token launches with advanced protection | [SKILL.md](skills/based-bid-create-flash-token/SKILL.md) |

## Launch Packages

Choose from three tiers when creating an LBP:

| Package       | Value | Description                               |
| ------------- | ----- | ----------------------------------------- |
| `BASED`       | `0`   | Basic launch, free                        |
| `SUPER_BASED` | `1`   | Team posts sale alerts on socials         |
| `ULTRA_BASED` | `2`   | Team posts sale and buy alerts on socials |

## Fee Structure

### Standard Fees (Max Values)

| Fee Type          | Max Value |
| ----------------- | --------- |
| `buyPoolCreator`  | 1%        |
| `sellPoolCreator` | 1%        |
| `buyReferral`     | 1%        |
| `graduation`      | 2.5%      |

### DEX Version Differences

| DEX                      | Fee Tier Range | Notes                    |
| ------------------------ | -------------- | ------------------------ |
| V3 (Uniswap/PancakeSwap) | 1% only        | Limited fee flexibility  |
| V4 (Uniswap/PancakeSwap) | 1-10%          | Full Fee Builder support |

**Note**: V4 is always preferred for new launches as it enables:

- Higher fee payouts (up to 10%)
- Fee Builder customization
- Advanced protection features

## API Reference

### BasedBid API

Base URL: `https://cdn.based.bid/api`

Endpoints:

- `POST /create-lbp` - Create LBP transaction data
- `POST /create-flash` - Create flash token transaction data
- `POST /lbp-buy-preview` - Get buy transaction preview
- `POST /lbp-sell-preview` - Get sell transaction preview
- `POST /upload` - Upload image to IPFS
- `POST /upload/json` - Upload metadata to IPFS

### Utility Classes

#### `BasedBidApi`

Static API request wrapper for BasedBid endpoints.

```typescript
const response = await BasedBidApi.invokeApi<ReturnType>(endpoint, payload);
```

#### `IpfsUpload`

Handles image and metadata uploads to IPFS.

```typescript
const logoUrl = await IpfsUpload.uploadImage('./logo.png');
const metadataUrl = await IpfsUpload.uploadMetadata(metadataObject);
```

## Development

### Build

```bash
npm run build
```

### Lint

```bash
npx eslint src/
```

### Format

```bash
npx prettier --write src/
```

## Deployment

The project includes PM2 configuration for process management:

```bash
pm2 start ecosystem.config.js
```

## Dependencies

### Core

- `viem` - Modern Ethereum interface
- `ethers` - Ethereum library
- `zod` - Schema validation
- `dotenv` - Environment configuration

### Development

- `typescript` - Type system
- `ts-node` - TypeScript execution
- `eslint` - Linting
- `prettier` - Code formatting

## Architecture Notes

### ABI Normalization

The BasedBid API returns flattened transaction arguments. The `normalizeByAbi` utility expands these into nested tuple structures that viem expects:

```typescript
// API returns flat array - normalizeByAbi expands to ABI structure
const tupleArgs = createMemeAbi.inputs.map((input, index) =>
  normalizeByAbi(json.args[index], input, `args[${index}]`),
);
```

### IPFS Upload Flow

1. Upload token logo image
2. Construct metadata JSON with logo URL
3. Upload metadata JSON
4. Use metadata URL in API payload

### Transaction Flow

1. Validate input parameters (Zod schemas)
2. Upload logo/metadata to IPFS
3. Call BasedBid API for transaction data
4. Estimate gas
5. Send transaction
6. Wait for confirmation
7. Output transaction receipt

## Security Considerations

- Never commit `.env` files with private keys
- Use dedicated wallet addresses for automation
- Verify contract addresses before transactions
- Test with small amounts on mainnet
