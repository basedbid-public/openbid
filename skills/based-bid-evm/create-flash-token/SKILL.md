# Create Flash Token Skill

## Description

Creates a Flash Token on the based.bid platform. Flash tokens launch immediately without a bonding curve, allowing instant trading. This is a simpler and faster alternative to LBP (Liquidity Bootstrapping Pool) launches.

Unlike LBPs which have a sale period with price discovery, flash tokens are deployed with liquidity immediately available on the DEX. This skill handles token creation, DEX configuration, and fee setup for launching a new meme token with flash mechanics.

Currently Ethereum, Binance Smart Chain and Base chains are supported. The user can launch on a V3 DEX (where they can set max 1% of fees) or V4 DEX (where users can increase fees up to 10% and get bigger payouts, also enabling the Fee Builder feature on V4).

Fee Builder allows users to reroute their fees however they like (up to `dex.feeTier` percent). Users can increase the percentage that goes into liquidity or buybacks from fees to strengthen their token's chart (`fees.v4.liquidity`), reward long-term token holders with airdrop payouts (`fees.v4.reward`) or send fee payouts to custom wallets (to payout KOLs or marketing teams).

**Optional `boardTitle`:** Only send this if the user explicitly wants to launch under a custom board they created via the create-board skill. If omitted, no board is sent. **Never send `'based'` or any default value unless the user explicitly requests it.**

## Invocation

Run the create-flash-token script directly using ts-node:

```bash
npx ts-node src/scripts/evm/create-flash-token.ts
```

Or build and run:

```bash
npm run build && node dist/scripts/evm/create-flash-token.js
```

## Parameters

The `createFlashToken` function accepts a `CreateFlashTokenEvmSdk` type (inferred from `evmFlashTokenCreateSdkSchema`):

```typescript
import { CreateFlashTokenEvmSdk } from 'schema/flash-token/evm/sdk';
```

**Schema location:** `schema/flash-token/evm/sdk.ts` — `evmFlashTokenCreateSdkSchema` (Zod)

**Key fields:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `chainId` | `number` | `1`, `56`, or `8453` |
| `token` | `object` | `name`, `symbol`, `totalSupply`, `initialBuyAmount`, `metadata` (logo, social links, description) |
| `sale` | `object` | `boardTitle?`, `marketCap`, `maxTxAmountPercent`, `protectBlocks` |

> **Board behavior:** `boardTitle` is **purely optional**. Only include it if the user explicitly provides a custom board name. Omitting it means the token launches without any board affiliation. **Do not send `'based'` or any default string.**
| `dex` | `object` | `version` (EvmDexType), `feeTier` |
| `fees` | `object` | `v4?` (V4 fees configuration) |

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

### Buy limits (snipe + hook whitelist)

```typescript
{
  buyLimits: {
    protectPeriod: number,      // seconds, 0–3600
    maxBuyPerOrigin: number,    // 0–10
    isHookWhitelist: false
  }
}
// or with hook whitelist:
{
  buyLimits: {
    protectPeriod: 600,
    maxBuyPerOrigin: 5,
    isHookWhitelist: true,
    maxBuyForWhitelisted: 10    // must be >= maxBuyPerOrigin
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
    // boardTitle: 'my-custom-board', // ONLY include if user explicitly wants a custom board
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
      buyLimits: {
        protectPeriod: 600,
        maxBuyPerOrigin: 5,
        isHookWhitelist: false,
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

## Sandbox Mode

For EVM chains, `isSandboxMode` is accepted in the SDK schema but **has no effect** — all operations execute on mainnet of the target chain (Ethereum, BSC, or Base). The parameter exists for API consistency with Solana workflows.

When using Solana, setting `isSandboxMode: true` routes to **testnet.based.bid** instead of the mainnet based.bid app, allowing experimentation without real funds. EVM always uses mainnet regardless of this setting.

```typescript
// isSandboxMode is accepted but ignored for EVM
await createFlashToken({
  chainId: 8453,
  token: { name: 'Test', symbol: 'TST', totalSupply: 1_000_000, initialBuyAmount: 0, metadata: { logo: './logo.png' } },
  dex: { version: EvmDexType.UNISWAP_V4, feeTier: 3 },
  isSandboxMode: true,  // Accepted but no effect on EVM (always uses mainnet)
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
