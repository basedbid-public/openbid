# Flash Token Creation CLI

Creates flash tokens on **Base** (EVM) or **Solana** blockchain via command-line interface.

## Scripts

| Script                          | Description                  |
| ------------------------------- | ---------------------------- |
| `bin/create-flash-token-base`   | Create flash token on Base   |
| `bin/create-flash-token-solana` | Create flash token on Solana |

## Usage

```bash
./bin/create-flash-token-base [options]
./bin/create-flash-token-solana [options]
```

## Required Options

| Option                | Description                   |
| --------------------- | ----------------------------- |
| `--token-name <name>` | Token name (e.g., "My Token") |
| `--symbol <symbol>`   | Token symbol (e.g., "MTK")    |

## Optional Options

| Option                             | Default                       | Description                       |
| ---------------------------------- | ----------------------------- | --------------------------------- |
| `--initial-supply <amount>`        | `1000000`                     | Total token supply                |
| `--logo <path>`                    | `./assets/placeholder.png`    | Path to token logo                |
| `--twitter <url>`                  | `""`                          | Twitter/X URL                     |
| `--telegram <url>`                 | `""`                          | Telegram URL                      |
| `--website <url>`                  | `""`                          | Website URL                       |
| `--discord <url>`                  | `""`                          | Discord URL                       |
| `--fee-tier <bps>`                 | `3`                           | DEX fee tier in basis points      |
| `--liquidity-fee <bps>`            | `1`                           | Liquidity fee in basis points     |
| `--buyback-fee <bps>`              | `1`                           | Buyback fee in basis points       |
| `--reward-token <token>`           | `ETH` (Base) / `SOL` (Solana) | Reward token symbol               |
| `--min-balance-dividends <amount>` | `0.01`                        | Min token balance for dividends   |
| `--sandbox`                        | _disabled_                    | Enable sandbox mode               |
| `--no-sandbox`                     | _enabled_                     | Disable sandbox mode (default)    |
| `--yes`                            | _off_                         | Skip mainnet confirmation         |
| `--dry-run`                        | _off_                         | Validate config without executing |
| `--validate`                       | _off_                         | Validate schema only              |

## Examples

### Create a basic token on Base

```bash
./bin/create-flash-token-base \
  --token-name "My Token" \
  --symbol "MTK"
```

### Create with custom fees and social links

```bash
./bin/create-flash-token-base \
  --token-name "Rat" \
  --symbol "RATONE" \
  --fee-tier 5 \
  --liquidity-fee 2 \
  --buyback-fee 2 \
  --twitter "https://x.com/rat" \
  --website "https://rat.com"
```

### Create on Solana

```bash
./bin/create-flash-token-solana \
  --token-name "My Token" \
  --symbol "MTK" \
  --reward-token "SOL"
```

### Validate without executing

```bash
./bin/create-flash-token-base \
  --token-name "Test" \
  --symbol "TST" \
  --dry-run
```

### Enable sandbox mode

```bash
./bin/create-flash-token-base \
  --token-name "Test" \
  --symbol "TST" \
  --sandbox
```

## Output Format

The script generates a JSON config matching this structure:

```json
{
  "isSandboxMode": false,
  "package": "based",
  "chainId": 8453,
  "token": {
    "name": "My Token",
    "symbol": "MTK",
    "totalSupply": 1000000,
    "initialBuyAmount": 0,
    "metadata": {
      "logo": "./assets/placeholder.png",
      "twitter": "",
      "telegram": "",
      "website": "",
      "discord": "",
      "description": ""
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
      "reward": {
        "token": "ETH",
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
      "mevProtectionEnabled": true,
      "minTokenBalanceForDividends": 0.01
    }
  }
}
```

## Environment Variables

Set these in your `.env` file:

| Variable               | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `PRIVATE_KEY`          | EVM wallet private key for signing transactions                 |
| `SOLANA_PRIVATE_KEY`   | Solana wallet private key for signing transactions              |
| `BASE_RPC_URL`         | Base blockchain RPC URL (default: `https://mainnet.base.org`)   |
| `SOLANA_RPC_URL`       | Solana RPC URL (default: `https://api.mainnet-beta.solana.com`) |
| `SKIP_TX_CONFIRMATION` | Set to `true` to skip all mainnet confirmations                 |

## Transaction Confirmation

When running on **mainnet** (sandbox disabled), the script prompts for confirmation before submitting transactions:

```
WARNING: This will submit a LIVE transaction on Base mainnet.
Continue? (y/N)
```

**Bypass confirmation for agent/demo flows:**

| Method       | Example                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------- |
| CLI flag     | `./bin/create-flash-token-base --yes --token-name "Test" --symbol "TST"`                     |
| Env variable | `SKIP_TX_CONFIRMATION=true ./bin/create-flash-token-base --token-name "Test" --symbol "TST"` |

## Notes

- Run `./install.sh` once before using the CLI scripts to install the required NPM dependencies
- Sandbox mode is **disabled** by default
- Chain ID: `8453` for Base, `101` for Solana
- Reward token defaults to `ETH` on Base, `SOL` on Solana
