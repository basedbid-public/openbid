# Create LBP Skill

## Description

Creates a Liquidity Bootstrapping Pool (LBP) on the based.bid platform. This skill handles token creation, DEX configuration, and fee setup for launching a new meme token with LBP mechanics.

Currently Ethereum, Binance Smart Chain and Base chains are supported. The user can launch on a V3 DEX (where they can set max 1% of fees, so V4 DEXes are always preferred since users can increase fees up to 10% and get bigger payouts, also we enable them to use our Fee Builder feature on V4).

Fee Builder allows users to reroute their fees however they like (up to `dex.feeTier` percent). Users can increase the percentage that goes into liquidity or buybacks from fees to strengthen their token's chart (`fees.v4.liquidity`), reward long-term token holders with airdrop payouts (`fees.v4.reward`) or send fee payouts to custom wallets (to payout KOLs or marketing teams).

**Optional `boardTitle`**: Only send this if the user explicitly wants to launch under a custom board they (or someone else) created via the create-board skill. If omitted, no board is sent — the token launches without being tied to any specific board. **Never send `'based'` or any default value unless the user explicitly requests it.**

## Agent Behavior

When the user requests an LBP launch, ALWAYS ask them to choose a mode:

**"Would you like a Simple or Advanced launch?"**
- **Simple** (default): Name, symbol, logo only. Uses recommended defaults. Bypasses transaction confirmation.
- **Advanced**: Full control over all parameters. Requires explicit confirmation before transaction.

Use `simple` if no preference specified.

**For Simple mode:**
- Collect: name, symbol, logo_url
- All other parameters use defaults
- Execute with `SKIP_TX_CONFIRMATION=true`

**For Advanced mode:**
- Follow the full Parameters section below
- Require user confirmation before transaction

### Simple Mode JSON Template

Generate this config, replacing the marked values with user input:

```json
{
  "isSandboxMode": true,
  "package": "based",
  "chainId": 8453,
  "token": {
    "name": "<USER_INPUT:name>",
    "symbol": "<USER_INPUT:symbol>",
    "totalSupply": 1000000,
    "initialBuyAmount": 0,
    "metadata": {
      "logo": "<USER_INPUT:logo_url>",
      "twitter": "",
      "telegram": "",
      "website": "",
      "discord": "",
      "description": ""
    }
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
    "graduation": 0.0025,
    "v4": {
      "liquidity": 1,
      "buyback": 1,
      "reward": {
        "token": "USDC",
        "amount": 1,
        "minTokenBalanceForDividends": 0.01
      },
      "customWallets": [],
      "feeThreshold": 0.1,
      "tieredFeesEnabled": false,
      "dynamicFees": {
        "hasHookDynamicFee": true,
        "volatilityDecayPeriod": "medium",
        "volatilityMultiplier": "medium",
        "volatilityTrigger": "per_block"
      },
      "cooldownProtection": {
        "cooldownDuration": "medium",
        "penaltyFee": "medium"
      },
      "buyLimits": {
        "protectPeriod": 600,
        "maxBuyPerOrigin": 5,
        "isHookWhitelist": false
      },
      "mevProtectionEnabled": false
    }
  }
}
```

**To execute (simple mode):**
```bash
SKIP_TX_CONFIRMATION=true npm run evm:create-lbp -- evm-create-lbp <config_file> --dry-run
# Then run without --dry-run to execute
```

---

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

The `createLbp` function accepts a `CreateLbpEvmSdk` type (inferred from `evmLbpCreateSchema`):

```typescript
import { CreateLbpEvmSdk } from 'schema/lbp/evm/sdk';
```

**Schema location:** `schema/lbp/evm/sdk.ts` — `evmLbpCreateSchema` (Zod)

**Key fields:**

| Parameter | Type                | Description                                                                                                                    |
| --------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `package` | `LaunchPackageType` | `BASED`, `SUPER_BASED`, or `ULTRA_BASED`                                                                                       |
| `chainId` | `number`            | `1`, `56`, `8453`, or `4663`                                                                                                           |
| `token`   | `object`            | `name`, `symbol`, `totalSupply`, `initialBuyAmount`, `marketCap`, **`boardTitle`?**, `metadata`                                    |

> **Board behavior:** `boardTitle` is **purely optional**. Only include it if the user explicitly provides a custom board name. Omitting it means the token launches without any board affiliation. **Do not send `'based'` or any default string.**
| `dex`     | `object`            | `version` (EvmDexType), `feeTier`                                                                                              |
| `fees`    | `object`            | `buyPoolCreator`, `sellPoolCreator`, `buyReferral`, `graduation`, `v4?`                                                        |
| `sale`    | `object`            | `startTime`, `maxAllocationPerUser`, `maxAllocationPerWhitelistedUser`, `delayTradeTime?`, `whitelistedAddresses?`, `softCap?` |

## Configuration

The script reads configuration from environment variables (see `.env`):

| Variable           | Required | Description                                                                 |
| ------------------ | -------- | --------------------------------------------------------------------------- |
| `PRIVATE_KEY`      | Yes      | Wallet private key for signing transactions                                 |
| `BASEDBID_API_KEY` | No       | Required only when launching under a custom board (see below)               |

On-chain operations use the BasedBid RPC proxy (`https://cdn.based.bid/api/rpc/evm`) for the `chainId` in your config. No RPC URL is required in `.env`.

### API Key Requirement

The `BASEDBID_API_KEY` environment variable is **required** when launching under a custom board.

**When is it needed?**
- If `boardTitle` is set to a non-empty string (custom board name), you must set `BASEDBID_API_KEY`
- If `boardTitle` is empty or omitted (default "based" board), no API key is needed

**Example `.env` for custom board launch:**
```env
PRIVATE_KEY=0x...
BASEDBID_API_KEY=bb_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Example `.env` for default board launch:**
```env
PRIVATE_KEY=0x...
# No BASEDBID_API_KEY needed
```

The SDK automatically includes the `x-api-key` header in BasedBid API requests and IPFS uploads when a custom board is specified.

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

## DEX Version Recommendation

**Important:** For new token launches, you should **use V4 by default** (`EvmDexType.UNISWAP_V4` or `EvmDexType.PANCAKESWAP_V4`).

V4 is the most modern and recommended approach because it:

- Supports up to 10% fee tier (vs V3's fixed 1%)
- Enables the full Fee Builder with dynamic fees, cooldown protection, and MEV protection
- Allows custom fee splits to reward holders and strengthen the token's chart
- Provides anti-snipe protection via `buyLimits`

Only use V3 (`EvmDexType.UNISWAP_V3` or `EvmDexType.PANCAKESWAP_V3`) if you specifically need V3 behavior or are migrating an existing V3 pool.

## Fee Structure

| Fee Type          | Max Value |
| ----------------- | --------- |
| `buyPoolCreator`  | 1%        |
| `sellPoolCreator` | 1%        |
| `buyReferral`     | 1%        |
| `graduation`      | 2.5%      |

## Fee Builder Options (V4)

When using V4, `fees.v4` includes liquidity/buyback/reward split, dynamic or tiered fees, cooldown/MEV options, and **`buyLimits`** (launch snipe protection + optional whitelist buy cap). Exactly one of dynamic fees or tiered fees must be enabled:

### Dynamic Fees

If enabled, fees increase with project volatility.

```typescript
{
  hasHookDynamicFee: true,
  volatilityDecayPeriod: VolatilityDecayPeriodType.FAST | 'MEDIUM' | 'SLOW',
  volatilityMultiplier: VolatilityMultiplierType.LOW | 'MEDIUM' | 'HIGH',
  volatilityTrigger: VolatilityTriggerType.PER_BLOCK | 'PER_EPOCH'
}
```

### Cooldown Protection

Limits how quickly the same wallet origin can trade again.

```typescript
{
  cooldownProtection: {
    cooldownDuration: CooldownDurationType.SHORT | 'MEDIUM' | 'LONG',
    penaltyFee: PenaltyFeeType.LOW | 'MEDIUM' | 'HIGH'
  }
}
```

### Buy limits

Set the protected window, max buy per wallet (as % of supply), and optionally a higher cap for whitelisted wallets.

| Field                  | Type      | Range               | Description                                                                            |
| ---------------------- | --------- | ------------------- | -------------------------------------------------------------------------------------- |
| `protectPeriod`        | `number`  | 0–3600              | Protected window after launch, in **seconds** (snipe / early-buy guard).               |
| `maxBuyPerOrigin`      | `number`  | 0–10                | Max buy per wallet during that window, as **% of total supply**.                       |
| `isHookWhitelist`      | `boolean` | —                   | If `true`, whitelisted wallets may buy up to `maxBuyForWhitelisted`.                   |
| `maxBuyForWhitelisted` | `number`  | ≥ `maxBuyPerOrigin` | Only when `isHookWhitelist` is `true`. Higher % of supply cap for whitelisted wallets. |

**Without hook whitelist** (`isHookWhitelist: false`):

```typescript
buyLimits: {
  protectPeriod: 600,   // 10 minutes
  maxBuyPerOrigin: 5,   // 5% of supply per wallet
  isHookWhitelist: false,
}
```

**With hook whitelist** (`isHookWhitelist: true`):

```typescript
buyLimits: {
  protectPeriod: 600,
  maxBuyPerOrigin: 5,       // 5% for normal wallets
  isHookWhitelist: true,
  maxBuyForWhitelisted: 10, // 10% for whitelisted wallets (must be >= maxBuyPerOrigin)
}
```

`snipeProtection` is no longer used; use `buyLimits` instead.

### MEV Protection

Shields against front-running and sandwich attacks. May cause issues trading on some bots or swap interfaces.

```typescript
{
  mevProtectionEnabled: true;
}
```

### Tiered Fees

Applies tiered fee multiplier depending on buy size.

```typescript
{
  tieredFeesEnabled: true;
}
```

## Execution Flow

1. **Input Validation** - Schema validation via `evmLbpCreateSchema` from `schema/lbp/evm/sdk`
2. **IPFS Upload** - Token logo and metadata uploaded to IPFS
3. **API Request** - Payload sent to `${API_URL}/create-lbp` which returns ABI-encoded contract call data
4. **API Schema Validation** - `evmLbpCreateApiSchema.parse(apiPayload)` from `schema/lbp/evm/api`
5. **ABI normalization** - The API returns flattened args; `normalizeByAbi` expands tuples back to nested structures viem expects
6. **Whitelist buy args** - If `args[14]` (`whitelistOptionForHookBuy`) is missing, it is derived from `fees.v4.buyLimits`
7. **Transaction** - Signed and sent via `sendTransaction`

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

| Error                                       | Cause                                     | Fix                                                                |
| ------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `board api key required`                    | Custom board specified but no API key     | Add `BASEDBID_API_KEY` to `.env`                                   |
| `AbiEncodingLengthMismatchError`            | ABI args mismatch - check tuple expansion | Verify `normalizeByAbi` is correctly extracting tuple components   |
| `Invalid input arguments`                   | Schema validation failed                  | Check `evmLbpCreateSchema` requirements                            |
| `Failed to create LBP (BasedBid API)`       | API returned null                         | Check API server and network connectivity                          |
| `Missing required ABI value`                | `normalizeByAbi` can't find value         | Verify API response args match ABI input structure                 |
| `Expected tuple at args[14], got undefined` | API omitted `whitelistOptionForHookBuy`   | Ensure `fees.v4.buyLimits` is set; client patches from `buyLimits` |
| `Expected array at args[14], got undefined` | Same (LBP `createMeme` uses `tuple[]`)    | Same as above                                                      |

## Example Usage

Modify `src/scripts/evm/create-lbp.ts` to configure your LBP:

```typescript
import { createLbp } from './src/scripts/evm/create-lbp';

const args: CreateLbpEvmSdk = {
  chainId: base.id,
  token: {
    name: 'My Token',
    symbol: 'MTK',
    totalSupply: 1_000_000_000,
    initialBuyAmount: 0,
    marketCap: 10_000,
    // boardTitle: 'my-custom-board', // ONLY include if user explicitly wants a custom board
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
      buyLimits: {
        protectPeriod: 600,
        maxBuyPerOrigin: 5,
        isHookWhitelist: false,
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

## Sandbox Mode

For EVM chains, `isSandboxMode` is accepted in the SDK schema but **has no effect** — all operations execute on mainnet of the target chain (Ethereum, BSC, Base, or Robinhood Chain). The parameter exists for API consistency with Solana workflows.

When using Solana, setting `isSandboxMode: true` routes to **testnet.based.bid** instead of the mainnet based.bid app, allowing experimentation without real funds. EVM always uses mainnet regardless of this setting.

```typescript
// isSandboxMode is accepted but ignored for EVM
await createLbp({
  chainId: 8453,
  package: LaunchPackageType.BASED,
  token: { ... },
  dex: { version: EvmDexType.UNISWAP_V4, feeTier: 3 },
  fees: { ... },
  sale: { ... },
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
