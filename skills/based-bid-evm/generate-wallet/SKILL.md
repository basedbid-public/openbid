# Generate EVM Wallet Skill

## Description

Generate a new Ethereum wallet for use with the based.bid platform. This skill creates a random wallet with a fresh private key and automatically saves the credentials to your `.env` file.

The generated wallet can then be used for all EVM-based operations on based.bid including creating boards, creating LBPs, buying, selling, and claiming fees.

## Invocation

```bash
npx ts-node src/scripts/generate-wallet/evm.ts
```

Or build and run:

```bash
npm run build && node dist/scripts/generate-wallet/evm.js
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--chainId=1` | Ethereum Mainnet | - |
| `--chainId=56` | BNB Smart Chain | - |
| `--chainId=8453` | Base Mainnet | Base (8453) |

## Output

The script generates:

- **Address**: The wallet's public Ethereum address
- **Private Key**: The wallet's private key (hex format)
- **Chain**: The selected chain configuration

### `.env` File Updates

The script automatically updates your `.env` file:

```env
PRIVATE_KEY=0x...
EVM_RPC_URL=https://...
```

## Supported Chains

| Chain | Chain ID | RPC URL |
|-------|----------|---------|
| Ethereum | 1 | `https://eth.llamarpc.com` |
| BSC | 56 | `https://bsc-dataseed.binance.org` |
| Base | 8453 | `https://mainnet.base.org` |

## Example Usage

### Generate Wallet (Default - Base)

```bash
npx ts-node src/scripts/generate-wallet/evm.ts
```

Output:
```
========================================
  Generate EVM Wallet (base)
========================================

Generated wallet:
  Address: 0x...
  Chain:   base (chainId: 8453)

  Private Key: 0x...

  Saved to .env:
    PRIVATE_KEY=0x...8f5a6e
    EVM_RPC_URL=https://mainnet.base.org

========================================
```

### Generate Wallet on Ethereum

```bash
npx ts-node src/scripts/generate-wallet/evm.ts --chainId=1
```

### Generate Wallet on BSC

```bash
npx ts-node src/scripts/generate-wallet/evm.ts --chainId=56
```

## Security Notes

1. **Never share your private key** - It provides full control over your wallet
2. **Review .env file** - Ensure it was saved correctly after generation
3. **Fund carefully** - Only add funds you can afford to use for testing
4. **Use separate wallets** - Consider using different wallets for development vs production

## Funding Your Wallet

After generation, you'll need native tokens for gas fees:

| Chain | Faucet / Source |
|-------|-----------------|
| Ethereum | Purchase ETH from exchange or use faucet |
| BSC | Purchase BNB from exchange |
| Base | Get ETH from faucet like [faucet.chainstack.com](https://faucet.chainstack.com) or bridge from Ethereum |

## Next Steps

After generating your wallet:

1. Review your `.env` file
2. Fund the wallet with native tokens for gas fees
3. Use with other based.bid scripts:

```typescript
// Create a board
npx ts-node src/scripts/evm/create-board.ts

// Create an LBP
npx ts-node src/scripts/evm/create-lbp.ts

// Buy tokens
npx ts-node src/scripts/evm/lbp-buy.ts
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `.env file permission denied` | Cannot write to .env | Check file permissions |
| `Invalid chainId` | Unsupported chain ID | Use 1, 56, or 8453 |

## Wallet Security Best Practices

1. **Backup your private key** - Store it securely (password manager, hardware wallet)
2. **Never commit .env** - Add `.env` to your `.gitignore`
3. **Use separate wallets** - Consider using different wallets for dev vs prod
4. **Test with small amounts** - Use minimal funds for initial testing