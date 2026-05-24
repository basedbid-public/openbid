import { SolanaDexType } from '@enums/solana/dex.type';
import {
  CreateSolanaFlashTx1ApiResponse,
  CreateSolanaFlashTxApiResponse,
} from '@interfaces/lbp/create/solana-flash/api';
import { SolanaWrapper } from '@utils/solana-wrapper';
import { API_URL } from 'constants/api-url';
import 'dotenv/config';
import { validateEnvironmentSolana } from 'schema/environment';
import {
  CreateSolanaFlashTx1Api,
  CreateSolanaFlashTx2Api,
} from 'schema/flash-token/solana/api';
import { CreateSolanaFlashInput } from 'schema/flash-token/solana/sdk';
import { SolanaFlashValidator } from 'schema/flash-token/solana/validator';
import { BasedBidApi } from 'utils/based-bid-api';
import { IpfsUpload } from 'utils/ipfs-upload';

export const createFlashTokenSolana = async (args: CreateSolanaFlashInput) => {
  const env = validateEnvironmentSolana();

  const input = SolanaFlashValidator.validateInput(args);

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const logoUrl = await IpfsUpload.uploadImage(args.token.metadata.logo);

  const data = input;
  const { token, raydium, meteora, board, boardOwner } = data;

  const metadataIpfs = {
    name: token.name,
    symbol: token.symbol,
    decimals: token.decimals,
    totalSupply: token.totalSupply,
    logo: logoUrl,
    twitter: token.metadata.twitter,
    telegram: token.metadata.telegram,
    website: token.metadata.website,
    discord: token.metadata.discord,
    description: token.metadata.description,
    board,
    boardOwner,
  };

  const metadataUrl = await IpfsUpload.uploadMetadata(metadataIpfs);

  // Determine flashDex value (1 = Meteora, 2 = Raydium)
  const flashDex = args.flashDex === SolanaDexType.METEORA ? 1 : 2;

  // ==================== TX1 ====================
  console.log('\n=== Preparing Transaction 1 ===');

  const tx1Endpoint = `${API_URL}/sol/create-flash-tx1`;

  const tx1Payload: CreateSolanaFlashTx1Api = {
    chainId: 5011,
    signer: solanaWrapper.publicKey,
    flashDex,
    token: {
      name: token.name,
      symbol: token.symbol,
      metadataUrl: metadataUrl,
      totalSupply: token.totalSupply,
      decimals: token.decimals,
    },
    // Add Raydium specific fields if applicable
    ...(input.flashDex === SolanaDexType.RAYDIUM &&
      raydium && {
        raydiumFeeTierIndex: raydium.feeTierIndex,
        finalStartPrice: raydium.finalStartPrice,
        hasInitialSwap: raydium.hasInitialSwap,
        solanaInitialBuyHuman: raydium.solanaInitialBuyHuman,
      }),
    // Add Meteora specific fields if applicable
    ...(input.flashDex === SolanaDexType.METEORA &&
      meteora && {
        baseTokenMint: 'So11111111111111111111111111111111111111112',
        virtualUsd: meteora.virtualUsd,
        nativeSolPriceUsd: meteora.nativeSolPriceUsd,
        meteoraFeeTierIndex: meteora.feeTierIndex,
        hasHookDynamicFee: meteora.hasHookDynamicFee,
        boardSeed: meteora.boardSeed,
      }),
  };

  console.log('Calling API for Transaction 1...');
  const tx1Response =
    await BasedBidApi.invokeApi<CreateSolanaFlashTx1ApiResponse>(
      tx1Endpoint,
      { data: tx1Payload },
      'Failed to create flash token Transaction 1',
    );

  if (!tx1Response || !tx1Response.transaction) {
    throw new Error(
      'Based Bid API Error: Failed to create flash LBP Transaction 1',
    );
  }

  const mintSigner = await solanaWrapper.getSignerFromPrivateKey(
    tx1Response.mintSignerSecretHex,
  );

  const tx1Signature = await solanaWrapper.sendTransaction(
    tx1Response.transaction,
    tx1Response.blockhash,
    tx1Response.lastValidBlockHeight,
    [mintSigner.keyPair],
  );

  await solanaWrapper.awaitTxConfirmation(tx1Signature);

  // ==================== TX2 ====================
  console.log('\n=== Preparing Transaction 2 ===');

  const tx2Endpoint = `${API_URL}/sol/create-flash-tx2`;

  const tx2Payload: CreateSolanaFlashTx2Api = {
    chainId: 5011,
    signer: solanaWrapper.publicKey,
    flashDex,
    tx1Signature,
    flashSeed: tx1Response.flashSeed,
    mintAddress: tx1Response.mintAddress,
    baseTokenMint: 'So11111111111111111111111111111111111111112',
    raiseTokenDecimals: 9,
    token: {
      totalSupply: args.token.totalSupply,
      decimals: 9,
    },
    // Add Raydium specific fields if applicable
    ...(args.flashDex === SolanaDexType.RAYDIUM &&
      args.raydium && {
        raydiumFeeTierIndex: '0',
        finalStartPrice: 100,
        hasInitialSwap: false,
      }),
    // Add Meteora specific fields if applicable
    ...(args.flashDex === SolanaDexType.METEORA &&
      args.meteora && {
        meteoraFeeTierIndex: args.meteora.feeTierIndex,
        meteoraTokenAccountSeed: tx1Response.meteoraTokenAccountSeed,
      }),
  };

  console.log('Calling API for Transaction 2...');
  const tx2Response =
    await BasedBidApi.invokeApi<CreateSolanaFlashTxApiResponse>(
      tx2Endpoint,
      { data: tx2Payload },
      'Failed to create flash token Transaction 2',
    );

  if (!tx2Response || !tx2Response.transaction) {
    throw new Error(
      'Based Bid API Error: Failed to create flash LBP Transaction 2',
    );
  }

  console.log('Transaction 2 data received');

  const tx2Signers = [];

  // For Raydium TX2 (and potentially others), there's a position NFT mint keypair signer
  if (tx2Response.positionNftSignerSecretHex) {
    const tx2PositionNftSigner = await solanaWrapper.getSignerFromPrivateKey(
      tx2Response.positionNftSignerSecretHex,
    );

    tx2Signers.push(tx2PositionNftSigner.keyPair);
  }

  const tx2Signature = await solanaWrapper.sendTransaction(
    tx2Response.transaction,
    tx2Response.blockhash,
    tx2Response.lastValidBlockHeight,
    tx2Signers,
  );

  await solanaWrapper.awaitTxConfirmation(tx2Signature);

  return {
    mintAddress: tx1Response.mintAddress,
    tx1Signature,
    tx2Signature,
    metadataUrl,
    meteoraTokenAccountSeed: tx1Response.meteoraTokenAccountSeed,
    positionNftMintAddress: tx1Response.positionNftMintAddress,
  };
};
