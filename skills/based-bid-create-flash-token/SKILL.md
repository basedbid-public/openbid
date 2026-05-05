# Create Flash Token Skill

## Description

Creates a Flash Token on the based.bid platform. Flash tokens launch immediately without a bonding curve, allowing instant trading. This is a simpler and faster alternative to LBP (Liquidity Bootstrapping Pool) launches.

Unlike LBPs which have a sale period with price discovery, flash tokens are deployed with liquidity immediately available on the DEX. This skill handles token creation, DEX configuration, and fee setup for launching a new meme token with flash mechanics.

Currently Ethereum, Binance Smart Chain and Base chains are supported. The user can launch on a V3 DEX (where they can set max 1% of fees) or V4 DEX (where users can increase fees up to 10% and get bigger payouts, also enabling the Fee Builder feature on V4).

Fee Builder allows users to reroute their fees however they like (up to `dex.feeTier` percent). Users can increase the percentage that goes into liquidity or buybacks from fees to strengthen their token's chart (`fees.v4.liquidity`), reward long-term token holders with airdrop payouts (`fees.v4.reward`) or send fee payouts to custom wallets (to payout KOLs or marketing teams).

`boardTitle` parameter enables agents to launch their token under any whitelabel launchpad that is created on based.bid.

## Invocation

Run the create-flash-token script directly using ts-node:

```bash
npx ts-node src/create-flash-token.ts
```

Or build and run:

```bash
npm run build && node dist/create-flash-token.js
```

## Parameters

The `createFlashToken` function accepts a `CreateFlashTokenEvmSdk` interface:

```typescript
interface CreateFlashTokenEvmSdk {
  chainId: number; // 1 | 56 | 8453
  token: {
    name: string;
    symbol: string;
    totalSupply: number;
    initialBuyAmount: number;
    metadataUrl: string; // IPFS URL for token metadata
  };
  sale: {
    boardTitle?: string; // can launch under any custom board on based.bid - if omitted, it will launch under the `based` board, which is the platform default
    marketCap: number;
    maxTxAmountPercent: number; // maximum transaction amount as percentage (anti-whale protection)
    protectBlocks: number; // number of blocks to protect from snipers
  };
  dex: {
    version: EvmDexType;
    feeTier: number;
  };
  fees: {
    v4: V4Fees;
  };
}
```

## Configuration

The script reads configuration from environment variables (see `.env`):

| Variable      | Description                                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `PRIVATE_KEY` | Wallet private key for signing transactions                                                                                               |
| `RPC_URL`     | RPC endpoint for blockchain communication (this should be a chain-agnostic URL and should work on any supported chain - ETH, BNB or Base) |

## DEX Options

Supported DEX versions:

| DEX         | Versions                                                 |
| ----------- | -------------------------------------------------------- |
| Uniswap     | `EvmDexType.UNISWAP_V3`, `EvmDexType.UNISWAP_V4`         |
| PancakeSwap | `EvmDexType.PANCAKESWAP_V3`, `EvmDexType.PANCAKESWAP_V4` |

Fee tiers:

- V3: fee tier must be `1`
- V4: fee tier must be between `1` and `10`

## Sale Parameters

Flash tokens have different sale mechanics than LBPs:

| Parameter            | Description                                                      | Example |
| -------------------- | ---------------------------------------------------------------- | ------- |
| `marketCap`          | Initial market cap in USD                                        | 10000   |
| `maxTxAmountPercent` | Maximum transaction amount as percentage of total supply (0-100) | 0.1     |
| `protectBlocks`      | Number of blocks to restrict large buys (anti-snipe protection)  | 20      |

## Fee Builder Options (V4)

When using V4 fee builder, exactly one protection mechanism must be enabled:

### Dynamic Fees

```typescript
{
  hasHookDynamicFee: true,
  volatilityDecayPeriod: VolatilityDecayPeriodType.FAST | 'MEDIUM' | 'SLOW',
  volatilityMultiplier: VolatilityMultiplierType.LOW | 'MEDIUM' | 'HIGH',
  volatilityTrigger: VolatilityTriggerType.PER_BLOCK | 'PER_EPOCH'
}
```

### Cooldown Protection

```typescript
{
  cooldownProtection: {
    cooldownDuration: CooldownDurationType.SHORT | 'MEDIUM' | 'LONG',
    penaltyFee: PenaltyFeeType.LOW | 'MEDIUM' | 'HIGH'
  }
}
```

### Snipe Protection

```typescript
{
  snipeProtection: {
    maxBuyPerOrigin: MaxBuyPerOriginType.LOW | 'MEDIUM' | 'HIGH',
    protectPeriod: ProtectPeriodType.SHORT | 'MEDIUM' | 'LONG'
  }
}
```

### MEV Protection

```typescript
{
  mevProtectionEnabled: true;
}
```

### Tiered Fees

```typescript
{
  tieredFeesEnabled: true;
}
```

## Execution Flow

1. **Input Validation** - Schema validation via `evmFlashTokenCreateSdkSchema`
2. **Metadata Preparation** - Token metadata should be pre-uploaded to IPFS (unlike LBP which handles IPFS upload)
3. **API Request** - Payload sent to `${API_URL}/create-flash` which returns ABI-encoded contract call data
4. **ABI Normalization** - The API returns flattened args; `normalizeByAbi` expands tuples back to nested structures viem expects
5. **Transaction** - Signed and sent via `sendTransaction`

## Output

On success, the script outputs:

- Transaction hash
- Block number
- Gas used
- Transaction status
- Basescan URL for verification
- Token contract address

## Error Handling

Common errors:

| Error                                | Cause                                     | Fix                                                              |
| ------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------- |
| `AbiEncodingLengthMismatchError`     | ABI args mismatch - check tuple expansion | Verify `normalizeByAbi` is correctly extracting tuple components |
| `Invalid input arguments`            | Schema validation failed                  | Check `evmFlashTokenCreateSdkSchema` requirements                |
| `Failed to create flash token (API)` | API returned null                         | Check API server and network connectivity                        |
| `Missing required ABI value`         | `normalizeByAbi` can't find value         | Verify API response args match ABI input structure               |

## Example Usage

Modify `src/create-flash-token.ts` as reference to configure your Flash Token:

```typescript
const args: CreateFlashTokenEvmSdk = {
  chainId: base.id,
  token: {
    name: 'My Flash Token',
    symbol: 'MFT',
    totalSupply: 1_000_000_000,
    initialBuyAmount: 0,
    metadataUrl: 'https://ipfs.based.bid/ipfs/...', // Pre-uploaded to IPFS
  },
  sale: {
    boardTitle: 'based',
    marketCap: 10000,
    maxTxAmountPercent: 0.1,
    protectBlocks: 20,
  },
  dex: {
    version: EvmDexType.UNISWAP_V4,
    feeTier: 2,
  },
  fees: {
    v4: {
      liquidity: 1,
      buyback: 1,
      feeThreshold: 0.1,
      tieredFeesEnabled: false,
      dynamicFees: {
        hasHookDynamicFee: true,
        volatilityDecayPeriod: VolatilityDecayPeriodType.MEDIUM,
        volatilityMultiplier: VolatilityMultiplierType.MEDIUM,
        volatilityTrigger: VolatilityTriggerType.PER_BLOCK,
      },
      cooldownProtection: {
        cooldownDuration: CooldownDurationType.MEDIUM,
        penaltyFee: PenaltyFeeType.MEDIUM,
      },
      snipeProtection: {
        maxBuyPerOrigin: MaxBuyPerOriginType.MEDIUM,
        protectPeriod: ProtectPeriodType.MEDIUM,
      },
      mevProtectionEnabled: true,
      customWallets: [],
    },
  },
};

await createFlashToken(args);
```

## Key Differences from LBP

| Feature      | Flash Token                                                | LBP                                    |
| ------------ | ---------------------------------------------------------- | -------------------------------------- |
| Launch Type  | Instant liquidity                                          | Bonding curve with sale period         |
| Sale Period  | None - trades immediately                                  | Configurable duration with price curve |
| Metadata     | Pre-uploaded IPFS URL required                             | Automatic IPFS upload handled          |
| Package Type | Not applicable                                             | BASED / SUPER_BASED / ULTRA_BASED      |
| Anti-Snipe   | `maxTxAmountPercent`, `protectBlocks`                      | Whitelist, allocation limits           |
| API Endpoint | `/create-flash`                                            | `/create-lbp`                          |
| ABI Files    | `FlashLaunchForV3Facet.json`, `FlashLaunchForV4Facet.json` | `CreationFacet.json`                   |
