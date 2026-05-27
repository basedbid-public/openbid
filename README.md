# OpenBid

A TypeScript SDK for interacting with the [BasedBid](https://based.bid) platform - a decentralized token launchpad for creating and trading meme tokens on EVM chains and Solana.

## Table of Contents

- [Quick Start - Human](#quick-start---human)
- [Quick Start - Agent / AI](#quick-start---agent--ai)
- [Required Environment Variables](#required-environment-variables)
- [Config File Examples](#config-file-examples)
- [Dry Run and Validate Modes](#dry-run-and-validate-modes)
- [Debug Mode](#debug-mode)
- [Common Errors](#common-errors)
- [Project Overview](#project-overview)
- [Running Scripts](#running-scripts)
- [Configuration Reference](#configuration-reference)
- [Skills Documentation](#skills-documentation)

---

## Quick Start - Human

### 1. Clone and Install

```bash
git clone <repo-url>
cd openbid
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
# EVM (Ethereum, Base, BSC)
PRIVATE_KEY=your_wallet_private_key
EVM_RPC_URL=https://mainnet.base.org  # or your RPC endpoint

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_solana_private_key_as_base58

# Optional
BASEDBID_API_KEY=your_api_key_if_needed
```

### 3. Run Your First LBP

```bash
# Test with dry-run first (no real transactions)
npm run evm:create-lbp -- evm-create-lbp ./src/helpers/configs/evm/create-lbp.json --dry-run

# If dry-run looks good, run for real
npm run evm:create-lbp -- evm-create-lbp ./src/helpers/configs/evm/create-lbp.json
```

### 4. Parse the Output

Every script outputs structured JSON at the end:

```json
{
  "ok": true,
  "type": "pool",
  "network": "base-mainnet",
  "mintAddress": "0x...",
  "signature": "0x...",
  "metadataUrl": "ipfs://...",
  "basedBidUrl": "https://based.markets/pool/8453/0x..."
}
```

---

## Quick Start - Agent / AI

### Core Commands

```bash
# Build
npm run build

# EVM Operations
npm run evm:create-lbp -- <operation> <config-file> [--dry-run] [--validate]
npm run evm:create-board -- <operation> <config-file> [--dry-run] [--validate]
npm run evm:create-flash-token -- <operation> <config-file> [--dry-run] [--validate]
npm run evm:lbp-buy -- <operation> <config-file> [--dry-run] [--validate]
npm run evm:lbp-sell -- <operation> <config-file> [--dry-run] [--validate]
npm run evm:claim-fees -- <operation> <config-file> [--dry-run] [--validate]

# Solana Operations
npm run solana:create-lbp -- <operation> <config-file> [--dry-run] [--validate]
npm run solana:create-board -- <operation> <config-file> [--dry-run] [--validate]
npm run solana:create-flash-token -- <operation> <config-file> [--dry-run] [--validate]
npm run solana:lbp-buy -- <operation> <config-file> [--dry-run] [--validate]
npm run solana:lbp-sell -- <operation> <config-file> [--dry-run] [--validate]
npm run solana:claim-lbp-fees -- <operation> <config-file> [--dry-run] [--validate]
```

### Workflow

1. **Validate first**: Always run with `--validate` to check schema without any operations
2. **Dry-run second**: Run with `--dry-run` to see what API calls would be made
3. **Execute**: Run without flags to execute for real

### Flag Behavior

| Flag | What it does |
|------|--------------|
| `--dry-run` | Validates env + schema, prints API payloads, skips all execution (no IPFS, no API calls, no transactions) |
| `--validate` | Validates schema only, prints config summary, skips all operations |

### Structured Output

Every script returns JSON with these fields:

**Success:**
```json
{
  "ok": true,
  "type": "pool|board|flash-token|buy|sell|fees",
  "network": "solana-devnet|base-mainnet|ethereum-mainnet",
  "mintAddress": "...",
  "signature": "...",
  "metadataUrl": "...",
  "basedBidUrl": "..."
}
```

**Failure:**
```json
{
  "ok": false,
  "type": "...",
  "stage": "create-lbp|...",
  "network": "...",
  "error": "...",
  "retryable": true|false,
  "nextSteps": ["..."]
}
```

---

## Required Environment Variables

### EVM Chains (Ethereum, Base, BSC)

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Wallet private key (with 0x prefix for Base/Ethereum) |
| `EVM_RPC_URL` | Yes | RPC endpoint for EVM chain |
| `BASEDBID_API_KEY` | No | API key for custom board launches |

### Solana

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Yes | Private key as base58 string |
| `SOLANA_RPC_URL` | Yes | RPC endpoint (devnet or mainnet) |

### Supported Chains

**EVM:**
| Chain ID | Network |
|----------|---------|
| 1 | Ethereum Mainnet |
| 56 | BNB Smart Chain |
| 8453 | Base Mainnet |

**Solana:**
| Chain ID | Network |
|----------|---------|
| 5011 | Solana Devnet |
| 1399811149 | Solana Mainnet |

---

## Config File Examples

### EVM Create LBP (`configs/evm/create-lbp.json`)

```json
{
  "isSandboxMode": true,
  "package": "based",
  "chainId": 8453,
  "token": {
    "boardTitle": "",
    "name": "My Token",
    "symbol": "MTK",
    "totalSupply": 1000000,
    "initialBuyAmount": 0,
    "metadata": {
      "logo": "./assets/logo.png"
    },
    "marketCap": 10000
  },
  "sale": {
    "startTime": 0,
    "maxAllocationPerUser": 0,
    "maxAllocationPerWhitelistedUser": 0,
    "delayTradeTime": 0,
    "whitelistedAddresses": []
  },
  "dex": {
    "version": "uniswap_v4",
    "feeTier": 3
  },
  "fees": {
    "buyPoolCreator": 0.001,
    "sellPoolCreator": 0.001,
    "buyReferral": 0,
    "graduation": 0.0025
  }
}
```

### EVM Create Board (`configs/evm/create-board.json`)

```json
{
  "isSandboxMode": true,
  "chainId": 8453,
  "title": "My Board",
  "description": "A test board description",
  "logo": "./assets/logo.png",
  "banner": "./assets/banner.png",
  "fees": [
    { "launchPackage": "based", "feePer": "0.001" }
  ]
}
```

### EVM Create Flash Token (`configs/evm/create-flash-token.json`)

```json
{
  "isSandboxMode": true,
  "package": "based",
  "chainId": 8453,
  "token": {
    "name": "Flash Token",
    "symbol": "FLASH",
    "totalSupply": 1000000,
    "initialBuyAmount": 0,
    "metadata": {
      "logo": "./assets/logo.png"
    }
  },
  "dex": {
    "version": "uniswap_v4",
    "feeTier": 3
  },
  "fees": {
    "buyPoolCreator": 0.001,
    "sellPoolCreator": 0.001,
    "buyReferral": 0,
    "graduation": 0.0025
  }
}
```

### EVM LBP Buy (`configs/evm/lbp-buy.json`)

```json
{
  "isSandboxMode": true,
  "chainId": 8453,
  "address": "0xTokenAddress",
  "slippage": 5,
  "referrer": "0x0000000000000000000000000000000000000000",
  "amount": 0.01
}
```

### EVM LBP Sell (`configs/evm/lbp-sell.json`)

```json
{
  "isSandboxMode": true,
  "chainId": 8453,
  "address": "0xTokenAddress",
  "slippage": 5,
  "referrer": "0x0000000000000000000000000000000000000000",
  "amount": 100
}
```

### EVM Claim Fees (`configs/evm/claim-fees.json`)

```json
{
  "isSandboxMode": true,
  "chainId": 8453,
  "target": "pool",
  "address": "0xPoolOrBoardAddress"
}
```

### Solana Create LBP (`configs/solana/create-lbp.json`)

```json
{
  "isSandboxMode": true,
  "package": "based",
  "chainId": 5011,
  "board": "",
  "token": {
    "name": "My Token",
    "symbol": "MTK",
    "totalSupply": "1000000000",
    "initialBuyAmount": "0",
    "metadata": {
      "logo": "./assets/logo.png"
    }
  },
  "sale": {
    "marketCap": "9000",
    "startTime": 0,
    "maxAllocationPerUser": "0",
    "whitelistedAddresses": []
  },
  "dex": {
    "version": "meteora",
    "feeTier": "1"
  },
  "fees": {
    "buyPoolCreator": 0,
    "sellPoolCreator": 0,
    "buyReferral": 0,
    "graduation": 0
  }
}
```

### Solana Create Flash Token (`configs/solana/create-flash-token.json`)

```json
{
  "isSandboxMode": true,
  "package": "based",
  "chainId": 5011,
  "dex": {
    "version": "meteora",
    "feeTier": "1"
  },
  "token": {
    "name": "Flash Token",
    "symbol": "FLASH",
    "totalSupply": "1000000000",
    "decimals": 9,
    "metadata": {
      "logo": "./assets/logo.png"
    }
  },
  "meteora": {
    "virtualUsd": 0.01,
    "nativeSolPriceUsd": 150,
    "feeTierIndex": "1",
    "hasHookDynamicFee": true
  },
  "fees": {
    "feeDistribution": false,
    "dynamicFee": false,
    "liquidityPercent": 10,
    "buybackPercent": 10,
    "rewardPercent": 10,
    "marketingPercent": 5,
    "creatorPercent": 5,
    "customFeePercent": 0,
    "customFees": [],
    "collectQuoteThreshold": "0",
    "collectBaseThreshold": "0",
    "feeDistributionPayoutKind": "SOL",
    "minTokenBalanceForDividends": "0"
  }
}
```

### Solana LBP Buy (`configs/solana/lbp-buy.json`)

```json
{
  "isSandboxMode": true,
  "chainId": 5011,
  "address": "MintAddress",
  "amount": 0.01,
  "slippage": 5,
  "referrer": "11111111111111111111111111111111"
}
```

### Solana LBP Sell (`configs/solana/lbp-sell.json`)

```json
{
  "isSandboxMode": true,
  "chainId": 5011,
  "address": "MintAddress",
  "amount": 100,
  "slippage": 5
}
```

---

## Dry Run and Validate Modes

### Validate Mode (Schema Only)

Check if your config file is valid without doing anything else:

```bash
npm run evm:create-lbp -- evm-create-lbp ./src/helpers/configs/evm/create-lbp.json --validate
```

Output:
```
Schema validation passed for EVM Create LBP

========== VALIDATE MODE - No operations executed ==========
```

### Dry Run Mode (Full Preview)

Preview everything including API payloads, but skip actual execution:

```bash
npm run evm:create-lbp -- evm-create-lbp ./src/helpers/configs/evm/create-lbp.json --dry-run
```

Output shows:
- Loaded config
- IPFS URLs that would be uploaded
- Full API payload JSON
- What would be skipped

### Using Both Flags

```bash
# Both flags can be combined - validate runs first, then dry-run
npm run evm:create-lbp -- evm-create-lbp ./src/helpers/configs/evm/create-lbp.json --validate --dry-run
```

---

## Debug Mode

### Enable Debug Logging

Set debug environment variable before running:

```bash
# Linux/macOS
export DEBUG=openbid:*

# Windows (cmd)
set DEBUG=openbid:*

# Run with debug
npm run evm:create-lbp -- evm-create-lbp ./src/helpers/configs/evm/create-lbp.json
```

### View Full Error Traces

```bash
# Run with full stack traces
npm run evm:create-lbp -- evm-create-lbp ./src/helpers/configs/evm/create-lbp.json 2>&1
```

### Check API Responses

Edit `src/utils/based-bid-api.ts` to add request/response logging:

```typescript
console.log('API Request:', endpoint, JSON.stringify(payload, null, 2));
console.log('API Response:', JSON.stringify(result, null, 2));
```

---

## Common Errors

### Schema Validation Failed

**Error:**
```
Schema validation failed for EVM Create LBP:
Expected number, received string
```

**Fix:** Check your config JSON - numbers may be strings in JSON. Parse values appropriately:
```json
"totalSupply": 1000000    // not "1000000"
```

### Private Key Not Found

**Error:**
```
Private key not found in environment
```

**Fix:** Ensure `.env` file exists and `PRIVATE_KEY` is set:
```env
PRIVATE_KEY=0xyour_private_key_here
```

### RPC Connection Failed

**Error:**
```
Failed to connect to RPC endpoint
```

**Fix:**
- Check your `EVM_RPC_URL` or `SOLANA_RPC_URL`
- Try a different RPC endpoint (Infura, Alchemy, etc.)
- Check your internet connection

### Insufficient Balance

**Error:**
```
insufficient funds for gas
```

**Fix:** Add more funds to your wallet or use a testnet with faucet

### Invalid Chain ID

**Error:**
```
Invalid chain ID
```

**Fix:** Use supported chain IDs only:
- EVM: 1 (Ethereum), 56 (BSC), 8453 (Base)
- Solana: 5011 (Devnet), 1399811149 (Mainnet)

### IPFS Upload Failed

**Error:**
```
Failed to upload to IPFS
```

**Fix:** Check your internet connection, or the logo/banner file path exists

### Transaction Failed

**Error:**
```
Transaction reverted
```

**Fix:** Check the transaction on-chain explorer for more details. Common causes:
- Token already launched
- Invalid parameters
- Network congestion (try again)

### Vanity Address Release Failed

**Error:**
```
Failed to release vanity
```

**Fix:** The mint transaction may have succeeded. Check the mint address output and contact support if needed.

---

## What to Share with Devs

When reporting issues, include:

### 1. The Error Message
```
Schema validation failed for Solana Create LBP:
Expected number, received string at "dex.feeTier"
```

### 2. Your Config (redact private keys)
```json
{
  "chainId": 5011,
  "token": { "name": "Test", "symbol": "TEST" },
  "dex": { "version": "meteora", "feeTier": "1" }
}
```

### 3. The Structured Output
```json
{
  "ok": false,
  "type": "pool",
  "stage": "create-lbp",
  "network": "solana-devnet",
  "error": "...",
  "retryable": true
}
```

### 4. What You Tried
- Ran with `--validate` first: yes/no
- Ran with `--dry-run` first: yes/no
- Tried with different RPC: yes/no

---

## Project Overview

OpenBid provides a programmatic interface for:

- **Creating Boards** - Set up custom whitelabel launchpads
- **Creating LBPs** - Launch tokens with bonding curve mechanics
- **Creating Flash Tokens** - Instant token launches with advanced protection
- **Buying tokens** - Purchase tokens from LBPs and pools
- **Selling tokens** - Sell tokens back to pools
- **Claiming fees** - Collect fees from pools you created

### Supported Chains

- **EVM**: Ethereum, BNB Chain, Base
- **Solana**: Devnet, Mainnet

### Key Features

- IPFS integration for metadata uploads
- Zod schema validation
- Transaction confirmation tracking
- Comprehensive error handling with structured output
- Dry-run and validate modes for safe testing

---

## Running Scripts

### Using npm scripts

```bash
# Build first
npm run build

# EVM
npm run evm:create-lbp
npm run evm:create-board
npm run evm:create-flash-token
npm run evm:lbp-buy
npm run evm:lbp-sell
npm run evm:claim-fees

# Solana
npm run solana:create-lbp
npm run solana:create-board
npm run solana:create-flash-token
npm run solana:lbp-buy
npm run solana:lbp-sell
npm run solana:claim-lbp-fees
```

### Using ts-node directly

```bash
npx ts-node ./src/helpers/run.ts evm-create-lbp ./src/helpers/configs/evm/create-lbp.json
```

### Help

```bash
# Show available flags
npm run evm:create-lbp -- --help
```

---

## Configuration Reference

### Launch Packages

| Package | Value | Description |
|---------|-------|-------------|
| `based` | 0 | Basic launch, free |
| `super_based` | 1 | Team posts sale alerts |
| `ultra_based` | 2 | Team posts sale + buy alerts |

### DEX Versions

**EVM:**
| Version | Description |
|---------|-------------|
| `uniswap_v3` | Uniswap V3 |
| `uniswap_v4` | Uniswap V4 (preferred, supports Fee Builder) |
| `pancakeswap_v3` | PancakeSwap V3 |
| `pancakeswap_v4` | PancakeSwap V4 |

**Solana:**
| Version | Description |
|---------|-------------|
| `raydium` | Raydium DEX |
| `meteora` | Meteora DEX (preferred) |

### Fee Tiers

| Chain | Version | Range |
|-------|---------|-------|
| EVM V3 | Uniswap/PancakeSwap | 1% only |
| EVM V4 | Uniswap/PancakeSwap | 1-10% |
| Solana Raydium | Raydium | 1-10% |
| Solana Meteora | Meteora | Configurable |

---

## Skills Documentation

Detailed skill documentation is available in the `skills/` directory:

| Skill | Description |
|-------|-------------|
| [Create Board](skills/based-bid-create-board/SKILL.md) | Create custom whitelabel launchpads |
| [Create LBP](skills/based-bid-create-lbp/SKILL.md) | Launch tokens with LBPs |
| [Create Flash Token](skills/based-bid-create-flash-token/SKILL.md) | Instant token launches with protection |
| [Buy](skills/based-bid-buy/SKILL.md) | Purchase tokens from LBPs |
| [Sell](skills/based-bid-sell/SKILL.md) | Sell tokens (2-step: approve + sell) |

---

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
npm run format
```

---

## Architecture Notes

### ABI Normalization

The BasedBid API returns flattened transaction arguments. The `normalizeByAbi` utility expands these into nested tuple structures that viem expects.

### IPFS Upload Flow

1. Upload token logo image
2. Construct metadata JSON with logo URL
3. Upload metadata JSON
4. Use metadata URL in API payload

### Transaction Flow

1. Validate input parameters (Zod schemas)
2. Upload logo/metadata to IPFS (unless dry-run)
3. Call BasedBid API for transaction data
4. Send transaction
5. Wait for confirmation
6. Output structured JSON result

---

## Security Considerations

- Never commit `.env` files with private keys
- Use dedicated wallet addresses for automation
- Verify contract addresses before transactions
- Test with small amounts on testnet/sandbox mode first