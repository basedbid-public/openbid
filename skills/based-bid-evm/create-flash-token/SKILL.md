<table>
  <tr>
    <th>Name</th>
    <th>create-flash-token-evm</th>
  </tr>
  <tr>
    <td>Description</td>
    <td>Use this skill whenever the user wants to create a (flash) token. If EVM wallet is not yet configured, this skill explains how to set them up from scratch.</td>
  </tr>
</table>

# Create EVM Flash Token Skill

## Overview

Flash tokens launch immediately without a bonding curve, allowing instant trading. This is a simpler and faster alternative to LBP (Liquidity Bootstrapping Pool) launches.

Tokens are deployed with liquidity immediately available on the DEX. This skill handles token creation, DEX configuration, and fee setup of the new token.

Currently Ethereum, Binance Smart Chain and Base chains are supported. The user can launch on a V3 DEX (where they can set max 1% of fees) or V4 DEX (where users can increase fees up to 10% and get bigger payouts, also enabling the Fee Builder feature on V4).

Fee Builder allows users to reroute their fees however they like (up to `dex.feeTier` percent). Users can increase the percentage that goes into liquidity or buybacks from fees to strengthen their token's chart (`fees.v4.liquidity`), reward long-term token holders with airdrop payouts (`fees.v4.reward`) or send fee payouts to custom wallets (to payout KOLs or marketing teams).

## Setting up the request payload

### Launch Type:

- **Simple** (default): Name, symbol, logo only. Uses recommended defaults. Bypasses transaction confirmation.
- **Advanced**: Full control over all parameters. Requires explicit confirmation before transaction.

> **Agent note:**: ALWAYS ask the user to choose a mode. Use `simple` if no preference specified.

#### Simple Mode

**For Simple mode:**

- Prompt the user for the token name, token symbol and image
  - If image is not provided, use the `assets/placeholder.png` file as a placeholder
  - If the user provides an image, save it in the `assets` folder and fix the path in the `metadata.logo`
    object
  - optionally prompt the user for the description and use the default one if not provided: `This token was deployed on based.bid using the most advanced token standards. Programmable Economy: ENABLED`
- By default the token will launch on the Base chain, since it is cheapest and fastest
- All other parameters use defaults:
  - `totalSupply` should be `1000000`
  - `initialBuyAmount` should be `0`
  - `metadata` should only include the `logo`, the rest of the platforms should be empty string
  - the DEX should be Uniswap V4 wiht a fee tier of 3
  - v4 fees should be set and should be split between buybacks, liquidity and the creator wallet (see the example JSON below)
- Execute with `SKIP_TX_CONFIRMATION=true` so it does not wait for user to confirm the transaction

The payload for the `args` parameter of the `createEvmFlashToken` should look something like:

```json
{
  "isSandboxMode": false,
  "chainId": 8453,
  "token": {
    "name": "<USER_INPUT:name>",
    "symbol": "<USER_INPUT:symbol>",
    "totalSupply": 1000000,
    "initialBuyAmount": 0,
    "metadata": {
      "logo": "<USER_INPUT:logoUrl>",
      "twitter": "",
      "telegram": "",
      "website": "",
      "discord": "",
      "description": "<USER_INPUT:description>"
    }
  },
  "dex": {
    "version": "uniswap_v4",
    "feeTier": 3
  },
  "fees": {
    "v4": {
      "liquidity": 1,
      "buyback": 1,
      "feeThreshold": 0.1,
      "customWallets": [
        {
          "name": "Creator",
          "address": "<USER_WALLET_ADDRESS>",
          "amount": 1
        }
      ]
    }
  }
}
```

Edit the `src/helpers/configs/evm/create-flash-token.json` config file with the `name`, `symbol`, `logo` and `address` replaced with what the user entered.

Deploy the token with:

```bash
SKIP_TX_CONFIRMATION=true npm run evm:create-flash-token
```

---

#### Advanced Mode:

- Ask the user about each parameter specifically, refer to the `Parameters` section below
- Require user confirmation before transaction

Edit the `src/helpers/configs/evm/create-flash-token.json` config file with the parameters that the user entered.

Deploy the token with:

```bash
npm run evm:create-flash-token
```

## Parameters

**Key fields:**

| Parameter       | Type      | Description                                                                                                                |
| --------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `isSandboxMode` | `boolean` | denotes if the project should launch on based.bid's mainnet or testnet (set to `true` to experiment with various settings) |
| `chainId`       | `number`  | `1` (Ethereum), `56` (Binance Smart Chain), or `8453` (Base)                                                               |
| `token`         | `Token`   | token data                                                                                                                 |
| `boardTitle`    | `string`  | the board the token should launch under                                                                                    |
| `sale`          | `Sale`    | sale data                                                                                                                  |
| `dex`           | `Dex`     | DEX data                                                                                                                   |
| `fees`          | `Fees`    | fee data                                                                                                                   |

#### Token object

| Parameter          | Type       | Description                                                                                                                     |
| ------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `name`             | `string`   | token name                                                                                                                      |
| `symbol`           | `string`   | token symbol                                                                                                                    |
| `totalSupply`      | `number`   | token total supply                                                                                                              |
| `initialBuyAmount` | `number`   | ETH amount of how many tokens the token creator wants to buy as the initial buyer to secure a portion of the supply immediately |
| `metadata`         | `Metadata` | token metadata object that gets uploaded on IPFS                                                                                |

#### Metadata object

| Parameter     | Type     | Description                                                                     |
| ------------- | -------- | ------------------------------------------------------------------------------- |
| `logo`        | `string` | local path to the token logo                                                    |
| `twitter`     | `string` | Twitter/X page for the token (optional, should be set to `''` by default)       |
| `telegram`    | `string` | Telegram group for the token (optional, should be set to `''` by default)       |
| `website`     | `string` | website, associated with the token (optional, should be set to `''` by default) |
| `discord`     | `string` | Discord server URL for the token (optional, should be set to `''` by default)   |
| `description` | `string` | token description, shown on the based.bid web                                   |

#### Sale object

| Parameter            | Type     | Description                                                 |
| -------------------- | -------- | ----------------------------------------------------------- |
| `marketCap`          | `number` | (optional) starting market cap for your token               |
| `maxTxAmountPercent` | `number` | (optional) caps the maximum amount a single wallet can hold |
| `protectBlocks`      | `number` | (optional) number of protect blocks                         |

#### Dex object

| Parameter | Type         | Description                           |
| --------- | ------------ | ------------------------------------- |
| `version` | `EvmDexType` | type of DEX to launch on              |
| `feeTier` | `number`     | DEX fee percentage (up to 10% on EVM) |

#### Fee object

| Parameter | Type     | Description                             |
| --------- | -------- | --------------------------------------- |
| `v4`      | `V4Fees` | (optional) V4 fee builder configuration |

#### V4Fees object

| Parameter              | Type                 | Description                                                                                                                                   |
| ---------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `liquidity`            | `number`             | Percentage of fees to liquidity                                                                                                               |
| `buyback`              | `number`             | Percentage of fees to buyback                                                                                                                 |
| `reward`               | `object`             | Reward configuration with `token`, `amount`, `minTokenBalanceForDividends`                                                                    |
| `customWallets`        | `array`              | Array of custom wallet addresses for fee distribution - useful for sending custom fee amounts to the rest of the team (KOLs, marketing, etc.) |
| `feeThreshold`         | `number`             | The ETH amount that denotes how often fees get distributed                                                                                    |
| `tieredFeesEnabled`    | `boolean`            | Increases fee amount on sell (more than 5% sell - 25% fee increaase; more than 10% sell - 40% fee increase)                                   |
| `dynamicFees`          | `DynamicFees`        | Dynamic fee configuration that increases fees with project volatility                                                                         |
| `cooldownProtection`   | `CooldownProtection` | Limits how quickly the same wallet can trade again                                                                                            |
| `buyLimits`            | `BuyLimits`          | Buy limit settings                                                                                                                            |
| `mevProtectionEnabled` | `boolean`            | Enable MEV protection to shield against front-running and sandwich attack                                                                     |

#### DynamicFees object

| Parameter               | Type      | Description                                                   |
| ----------------------- | --------- | ------------------------------------------------------------- |
| `hasHookDynamicFee`     | `boolean` | Enable dynamic fees based on volatility                       |
| `volatilityDecayPeriod` | `string`  | How fast volatility decays: `"fast"`, `"medium"`, or `"slow"` |
| `volatilityMultiplier`  | `string`  | Volatility multiplier: `"low"`, `"medium"`, or `"high"`       |
| `volatilityTrigger`     | `string`  | When volatility is measured: `"per_block"` or `"per_epoch"`   |

#### CooldownProtection object

| Parameter          | Type     | Description                                                               |
| ------------------ | -------- | ------------------------------------------------------------------------- |
| `cooldownDuration` | `string` | Cooldown duration: `"short"`, `"medium"`, or `"long"`                     |
| `penaltyFee`       | `string` | Penalty fee for trading during cooldown: `"low"`, `"medium"`, or `"high"` |

#### BuyLimits object

| Parameter         | Type      | Description                                                            |
| ----------------- | --------- | ---------------------------------------------------------------------- |
| `protectPeriod`   | `number`  | Protection period in seconds (0-3600)                                  |
| `maxBuyPerOrigin` | `number`  | Maximum buy per origin (0-10)                                          |
| `isHookWhitelist` | `boolean` | Enable hook whitelist (allows higher limits for whitelisted addresses) |

### DEX Options

Supported DEX versions:

| DEX         | Versions                                                 |
| ----------- | -------------------------------------------------------- |
| Uniswap     | `EvmDexType.UNISWAP_V3`, `EvmDexType.UNISWAP_V4`         |
| PancakeSwap | `EvmDexType.PANCAKESWAP_V3`, `EvmDexType.PANCAKESWAP_V4` |

Fee tiers:

- V3: fee tier must be `1`
- V4: fee tier must be between `1` and `10`

#### DEX Version Recommendation

**Important:** For new token launches, you should **use V4 by default** (`EvmDexType.UNISWAP_V4` or `EvmDexType.PANCAKESWAP_V4`).

V4 is the most modern and recommended approach because it:

- Supports up to 10% fee tier (vs V3's fixed 1%)
- Enables the full Fee Builder with dynamic fees, cooldown protection, and MEV protection
- Allows custom fee splits to reward holders and strengthen the token's chart
- Provides anti-snipe protection via `buyLimits`

Only use V3 (`EvmDexType.UNISWAP_V3` or `EvmDexType.PANCAKESWAP_V3`) if the user specifically asks for it.

## Execution Flow

1. **Input Validation**
2. **Metadata upload** - Token metadata should be pre-uploaded to IPFS
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

> **Agent note:**: Inform the user that the launch was successful and present them with the TX hash as well as the address of the token that got deployed

## Error Handling

Common errors:

| Error                                | Cause                                     | Fix                                                              |
| ------------------------------------ | ----------------------------------------- | ---------------------------------------------------------------- |
| `AbiEncodingLengthMismatchError`     | ABI args mismatch - check tuple expansion | Verify `normalizeByAbi` is correctly extracting tuple components |
| `Invalid input arguments`            | Schema validation failed                  | Check `evmFlashTokenCreateSdkSchema` requirements                |
| `Failed to create flash token (API)` | API returned null                         | Check API server and network connectivity                        |
| `Missing required ABI value`         | `normalizeByAbi` can't find value         | Verify API response args match ABI input structure               |

## Key Differences from LBP

| Feature      | Flash Token                                                | LBP                                    |
| ------------ | ---------------------------------------------------------- | -------------------------------------- |
| Launch Type  | Instant liquidity                                          | Bonding curve with sale period         |
| Sale Period  | None - trades immediately                                  | Configurable duration with price curve |
| Package Type | Not applicable                                             | BASED / SUPER_BASED / ULTRA_BASED      |
| Anti-Snipe   | `maxTxAmountPercent`, `protectBlocks`                      | Whitelist, allocation limits           |
| API Endpoint | `/create-flash`                                            | `/create-lbp`                          |
| ABI Files    | `FlashLaunchForV3Facet.json`, `FlashLaunchForV4Facet.json` | `CreationFacet.json`                   |

## Sandbox Mode

For EVM chains, `isSandboxMode` is accepted in the SDK schema. If true, it will launch on based.bid's testnet app, allowing you to test configuration before you plan to go fully live.

> **Agent note:**: By default always put sandbox mode to false, only offer the user the option if they seem to want to play around with the advanced settings before launching on mainnet.
