# Generate Solana Wallet Skill

## Description

Generate a new Solana wallet for use with the based.bid platform. This skill creates a random keypair with a fresh private key and automatically saves the credentials to your `.env` file.

The generated wallet can then be used for all Solana-based operations on based.bid including creating boards, creating LBPs, creating flash tokens, buying, selling, and claiming fees.

## Invocation

```bash
npx ts-node src/scripts/generate-wallet/solana.ts
```

Or build and run:

```bash
npm run build && node dist/scripts/generate-wallet/solana.js
```

## Output

The script generates:

- **Address**: The wallet's public key (base58)
- **Network**: Solana Devnet
- **Private Key**: The wallet's private key (base58 format)

### `.env` File Updates

The script automatically updates your `.env` file:

```env
SOLANA_PRIVATE_KEY=...
SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Network

| Network | RPC URL |
|---------|---------|
| Solana Devnet | `https://api.devnet.solana.com` |

## Example Usage

### Generate Wallet

```bash
npx ts-node src/scripts/generate-wallet/solana.ts
```

Output:
```
========================================
  Generate Solana Wallet
========================================

Generated wallet:
  Address: 7K2h...
  Network: Solana Devnet

  Private Key (base58): 4fq...

  Saved to .env:
    SOLANA_PRIVATE_KEY=4fq...K2h
    SOLANA_RPC_URL=https://api.devnet.solana.com

========================================
```

## Funding Your Wallet

After generation, you'll need SOL tokens for transaction fees on devnet:

**Get free devnet SOL:**
- [Solana Faucet](https://faucet.solana.com)
- [Solana Devnet Faucet](https://api.devnet.solana.com/faucet)

Airdrop command:
```bash
solana airdrop 2 --url devnet
```

## Next Steps

After generating your wallet:

1. Review your `.env` file
2. Fund the wallet with devnet SOL using the faucet
3. Use with other based.bid Solana scripts:

```typescript
// Create a board
npx ts-node src/scripts/solana/create-board.ts

// Create an LBP
npx ts-node src/scripts/solana/create-lbp.ts

// Create a flash token
npx ts-node src/scripts/solana/create-flash-token.ts

// Buy tokens
npx ts-node src/scripts/solana/lbp-buy.ts
```

## Sandbox Mode

This wallet can be used with sandbox mode (`isSandboxMode: true`) to test operations without real funds on **testnet.based.bid**:

```typescript
await createBoardSolana({
  isSandboxMode: true,  // Uses testnet.based.bid
  title: 'Test Board',
  description: 'Testing on devnet',
  logo: './path/to/logo.png',
});
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `.env file permission denied` | Cannot write to .env | Check file permissions |
| `Wallet has no SOL` | Insufficient balance for fees | Airdrop devnet SOL |

## Wallet Security Best Practices

1. **Never share your private key** - It provides full control over your wallet
2. **Backup your private key** - Store it securely (password manager, hardware wallet)
3. **Never commit .env** - Add `.env` to your `.gitignore`
4. **Use separate wallets** - Consider using different wallets for dev vs prod
5. **Test with small amounts** - Use minimal funds for initial testing

## Key Format

The private key is stored in **base58 format** (like traditional Solana wallets). This is the format expected by Solana tools and the based.bid platform.

Example base58 private key:
```
4fqJrJhfB...K2h8z2
```