export function printNextSteps(title: string, steps: string[]) {
  console.log(`\n${title}`);
  console.log('----------------------------------------');
  steps.forEach((step, index) => {
    console.log(`${index + 1}. ${step}`);
  });
  console.log('');
}

export function getBasedBidTokenUrl(
  mintAddress: string,
  isSandboxMode: boolean,
) {
  const baseUrl = isSandboxMode
    ? 'https://testnet.based.bid'
    : 'https://based.bid';
  return `${baseUrl}/token/${mintAddress}`;
}

export function getBasedBidBoardUrl(
  boardTitle: string,
  isSandboxMode: boolean,
) {
  const baseUrl = isSandboxMode
    ? 'https://testnet.based.bid'
    : 'https://based.bid';
  return `${baseUrl}/b/${encodeURIComponent(boardTitle.toLowerCase())}`;
}

export function printCreatedTokenSummary(params: {
  addressLabel?: string;
  mintAddress: string;
  basedBidUrl: string;
}) {
  console.log('----------------------------------------');
  console.log('SUCCESS: YOUR TOKEN IS CREATED');
  console.log('----------------------------------------');
  console.log(
    `${params.addressLabel ?? 'This is your token contract address'}:`,
  );
  console.log(params.mintAddress);
  console.log('');
  console.log('This is your basedbid link:');
  console.log(params.basedBidUrl);
  console.log('----------------------------------------\n');
}

export function printCreatedBoardSummary(params: {
  boardId: string;
  boardTitle: string;
  basedBidUrl: string;
}) {
  console.log('----------------------------------------');
  console.log('SUCCESS: YOUR BOARD IS CREATED');
  console.log('----------------------------------------');
  console.log('This is your board id:');
  console.log(params.boardId);
  console.log('');
  console.log('This is your board title:');
  console.log(params.boardTitle);
  console.log('');
  console.log('This is your basedbid link:');
  console.log(params.basedBidUrl);
  console.log('----------------------------------------\n');
}

export function getOpenBidApiKey() {
  return process.env.OPENBID_API_KEY ?? process.env.BOARD_API_KEY;
}

export function getSolanaApiFailureHint(errorBody: string) {
  const normalizedError = errorBody.toLowerCase();

  if (normalizedError.includes('board api key required')) {
    return [
      'If you are launching without a Board, omit board and boardOwner fields.',
      'If you are launching under a Board, add OPENBID_API_KEY=<key> to .env.',
      'Then rerun npm run launch:solana:pool_devnet.',
    ];
  }

  if (normalizedError.includes('no vanity address found')) {
    return [
      'Retry once in case the devnet vanity pool was temporarily exhausted.',
      'If it repeats, ask basedbid devs to check the Solana vanity config for chainId 5011.',
    ];
  }

  if (
    normalizedError.includes('amountzero') ||
    normalizedError.includes('amount zero')
  ) {
    return [
      'Use a larger token amount. Very small sell amounts can round to zero on-chain.',
      'Try selling 1 token first, then reduce once the flow is confirmed.',
    ];
  }

  if (
    normalizedError.includes('feenftmint') ||
    normalizedError.includes('feenftaccount')
  ) {
    return [
      'This pool record is missing fee collection fields.',
      'Try a newer pool, or ask basedbid devs to check feeNftMint, feeNftAccount, and pair on the pool record.',
    ];
  }

  if (normalizedError.includes('invalid transaction')) {
    return [
      'Retry once. Devnet address lookup tables can be briefly stale.',
      'If it repeats, ask basedbid devs to inspect the generated transaction lookup table indexes.',
    ];
  }

  return [
    'Check the full API error above.',
    'If this is devnet, retry once.',
    'If it repeats, share the command, token config, and API error with basedbid devs.',
  ];
}

export function getSolanaEnvironmentHint() {
  return [
    'Run npm run wallet:solana to create or refresh .env.',
    'Fund the printed wallet address at https://faucet.solana.com.',
    'Rerun npm run launch:solana:pool_devnet.',
  ];
}
