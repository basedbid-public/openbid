import { existsSync, readFileSync, writeFileSync } from 'fs';
import { evmChainIdSchema } from 'schema/common';
import { EvmChainId } from 'types/chain-id';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const DEFAULT_RPC_URLS: Record<EvmChainId, string> = {
  1: 'https://eth.llamarpc.com',
  56: 'https://bsc-dataseed.binance.org',
  8453: 'https://mainnet.base.org',
};

export const generateEvmWallet = (data: EvmChainId) => {
  const parsedChainId = evmChainIdSchema.safeParse(data);
  if (!parsedChainId.success) {
    throw new Error('Invalid chain ID');
  }

  const chainId = parsedChainId.data;

  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  console.log(`Generated wallet ${account.address}:`);

  const envPath = '.env';
  const privateKeyLine = `PRIVATE_KEY=${privateKey}`;
  const rpcUrlLine = `EVM_RPC_URL=${DEFAULT_RPC_URLS[chainId]}`;

  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    const filteredLines = lines.filter((line) => {
      const key = line.split('=')[0];
      return key !== 'PRIVATE_KEY' && key !== 'EVM_RPC_URL';
    });
    const newContent = [...filteredLines, privateKeyLine, rpcUrlLine].join(
      '\n',
    );
    writeFileSync(envPath, newContent + '\n');
  } else {
    const envContent = [
      privateKeyLine,
      rpcUrlLine,
      '',
      '# Solana (optional)',
      'SOLANA_PRIVATE_KEY=',
      'SOLANA_RPC_URL=',
    ].join('\n');
    writeFileSync(envPath, envContent + '\n');
  }

  console.log('Saved wallet to .env');
  console.log(`
    Next steps:
      1. Review your .env file to ensure settings are correct
      2. You can now use this wallet with other based.bid scripts
      3. Fund the wallet with native tokens for gas fees
      
    Example usage:
      npx ts-node src/scripts/evm/create-board.ts
      
    Available chains:
      --chainId=1   (Ethereum Mainnet)
      --chainId=56  (BNB Smart Chain)
      --chainId=8453 (Base Mainnet)
    `);

  return {
    address: account.address,
    privateKey,
    chainId: data,
    rpcUrl: DEFAULT_RPC_URLS[data],
  };
};
