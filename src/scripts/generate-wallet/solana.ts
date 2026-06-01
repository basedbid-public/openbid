import { createKeyPairSignerFromPrivateKeyBytes } from '@solana/kit';
import bs58 from 'bs58';
import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { printNextSteps } from 'utils/next-steps';

export const generateSolanaWallet = async () => {
  const randomBytesBuffer = randomBytes(32);
  const privateKeyBytes = new Uint8Array(randomBytesBuffer);
  const signer = await createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes);

  console.log(`Generated wallet ${signer.address}:`);

  const privateKeyBase58 = bs58.encode(privateKeyBytes);
  const address = signer.address;

  const envPath = '.env';
  const privateKeyLine = `SOLANA_PRIVATE_KEY=${privateKeyBase58}`;

  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    const filteredLines = lines.filter((line) => {
      const key = line.split('=')[0];
      return key !== 'SOLANA_PRIVATE_KEY';
    });
    const newContent = [...filteredLines, privateKeyLine].join('\n');
    writeFileSync(envPath, newContent + '\n');
  } else {
    const envContent = [
      privateKeyLine,
      '',
      '# EVM (optional)',
      'PRIVATE_KEY=',
    ].join('\n');
    writeFileSync(envPath, envContent + '\n');
  }
  console.log('Saved wallet to .env');

  printNextSteps('Next Steps', [
    `Fund ${address} with devnet SOL at https://faucet.solana.com`,
    'Add a small test logo at assets/logo.jpg',
    'Run npm run solana:create-lbp',
    'For Flash Tokens, run npm run solana:create-flash-token',
    'For Boards, run npm run solana:create-board',
  ]);

  return {
    address,
    privateKey: privateKeyBase58,
  };
};

(async () => {
  await generateSolanaWallet();
})().catch(console.error);
