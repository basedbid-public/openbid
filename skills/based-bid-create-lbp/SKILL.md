# Create LBP Skill

## Description

Creates a Liquidity Bootstrapping Pool (LBP) on the based.bid platform. This skill handles token creation, DEX configuration, and fee setup for launching a new meme token with LBP mechanics.

Currently Ethereum, Binance Smart Chain and Base chains are supported. The user can launch on a V3 DEX (where they can set max 1% of fees, so V4 DEXes are always preferred since users can increase fees up to 10% and get bigger payouts, also we enable them to use our Fee Builder feature on V4).

Fee Builder allows users to reroute their fees however they like (up to `dex.feeTier` percent). Users can increase the percentage that goes into liquidity or buybacks from fees to strengthen their token's chart (`fees.v4.liquidity`), reward long-term token holders with airdrop payouts (`fees.v4.reward`) or send fee payouts to custom wallets (to payout KOLs or marketing teams).

`boardTitle` parameter enables agents to launch their token under any whitelabel launchpad that is created on based.bid.

## Invocation

Run the create-lbp script directly using ts-node:

```bash
npx ts-node src/create-lbp.ts
```

Or build and run:

```bash
npm run build && node dist/create-lbp.js
```

## Parameters

The `createLbp` function accepts a `CreateLbpEvmSdk` interface:

```typescript
interface CreateLbpEvmSdk {
  chainId: number; // 1 | 56 | 8453
  token:
    name: string;
    symbol: string;
    totalSupply: number;
    initialBuyAmount: number;
    marketCap: number;
    boardTitle?: string; // can launch under any custom board on based.bid - if omitted, it will launch under the `based` board, which is the platform default
    metadata: {
      logo: string;
      twitter?: string;
      telegram?: string;
      website?: string;
      discord?: string;
      description?: string;
    };
  ;
  dex: {
    version: EvmDexType;
    feeTier: number;
  };
  fees: {
    buyPoolCreator: number;
    sellPoolCreator: number;
    buyReferral: number;
    graduation: number;
    v4: V4Fees;
  };
  sale: {
    startTime: number;
    maxAllocationPerUser: number;
    maxAllocationPerWhitelistedUser: number;
    whitelistedAddresses: string[];
  };
  package: LaunchPackageType;
}
```

## Configurationqa

The script reads configuration from environment variables (see `.env`):

| Variable      | Description                                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `PRIVATE_KEY` | Wallet private key for signing transactions                                                                                               |
| `RPC_URL`     | RPC endpoint for blockchain communication (this should be a chain-agnostic URL and should work on any supported chain - ETH, BNB or Base) |

## Launch Packages

Choose from three tiers:

| Package                         | Value | Description                                                   |
| ------------------------------- | ----- | ------------------------------------------------------------- |
| `LaunchPackageType.BASED`       | `0`   | Basic launch, free                                            |
| `LaunchPackageType.SUPER_BASED` | `1`   | The based.bid team posts sale alerts on their socials         |
| `LaunchPackageType.ULTRA_BASED` | `2`   | The based.bid team posts sale and buy alerts on their socials |

## DEX Options

Supported DEX versions:

| DEX         | Versions                                                 |
| ----------- | -------------------------------------------------------- |
| Uniswap     | `EvmDexType.UNISWAP_V3`, `EvmDexType.UNISWAP_V4`         |
| PancakeSwap | `EvmDexType.PANCAKESWAP_V3`, `EvmDexType.PANCAKESWAP_V4` |

Fee tiers:

- V3: fee tier must be `1`
- V4: fee tier must be between `1` and `10`

## Fee Structure

| Fee Type          | Max Value |
| ----------------- | --------- |
| `buyPoolCreator`  | 1%        |
| `sellPoolCreator` | 1%        |
| `buyReferral`     | 1%        |
| `graduation`      | 2.5%      |

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

1. **Input Validation** - Schema validation via `evmLbpCreateSchema`
2. **IPFS Upload** - Token logo and metadata uploaded to IPFS
3. **API Request** - Payload sent to `${API_URL}/create-lbp` which returns ABI-encoded contract call data
4. **ABI Normalization** - The API returns flattened args; `normalizeByAbi` expands tuples back to nested structures viem expects
5. **Transaction** - Signed and sent via `sendTransaction`

**Wrong pattern** (mapping over entire ABI):

```typescript
// WRONG: iterates over all ABI entries (events, errors, functions) - args get misaligned
const tupleArgs = creationFacetAbi.map((input, index) => ...);
```

This caused `AbiEncodingLengthMismatchError: Expected length (params): 14, Given length (values): 8` - the flat args weren't being expanded into their nested tuple components.

### normalizeByAbi Utility

Located at `src/utils/normalize-abi.ts`. Handles:

- **Tuple expansion** - Flat arrays expanded to nested objects based on ABI component definitions
- **Array normalization** - Single tuples converted to `[tuple]` if ABI expects `tuple[]`
- **Key-based lookups** - When API returns `{ fieldName: value }` instead of ordered array

## Output

On success, the script outputs:

- Transaction hash
- Block number
- Gas used
- Transaction status
- Basescan URL for verification

## Error Handling

Common errors:

| Error                                 | Cause                                     | Fix                                                              |
| ------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `AbiEncodingLengthMismatchError`      | ABI args mismatch - check tuple expansion | Verify `normalizeByAbi` is correctly extracting tuple components |
| `Invalid input arguments`             | Schema validation failed                  | Check `evmLbpCreateSchema` requirements                          |
| `Failed to create LBP (BasedBid API)` | API returned null                         | Check API server and network connectivity                        |
| `Missing required ABI value`          | `normalizeByAbi` can't find value         | Verify API response args match ABI input structure               |

## Example Usage

Modify `src/create-lbp.ts` to configure your LBP:

```typescript
const args: CreateLbpEvmSdk = {
  chainId: base.id,
  token: {
    name: 'My Token',
    symbol: 'MTK',
    totalSupply: 1_000_000_000,
    initialBuyAmount: 0,
    boardTitle: 'based',
    marketCap: 10_000,
    metadata: {
      logo: 'path/to/logo.png',
      twitter: 'https://x.com/hande',
      telegram: 'https://t.me/hande',
      website: 'https://example.com',
      description: 'Token description',
    },
  },
  dex: {
    version: EvmDexType.UNISWAP_V4,
    feeTier: 3,
  },
  fees: {
    buyPoolCreator: 0.01,
    sellPoolCreator: 0.01,
    buyReferral: 0.01,
    graduation: 0.025,
    v4: {
      liquidity: 1,
      buyback: 1,
      reward: {
        token: RewardTokenType.USDC,
        amount: 1,
        minTokenBalanceForDividends: 0.01,
      },
      customWallets: [],
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
    },
  },
  sale: {
    startTime: Math.floor(Date.now() / 1000),
    maxAllocationPerUser: 0,
    maxAllocationPerWhitelistedUser: 0,
    whitelistedAddresses: [],
  },
  package: LaunchPackageType.BASED,
};

await createLbp(args);
```
