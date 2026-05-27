import 'dotenv/config';
import { ApiType, SolanaDexType } from 'enums';
import { CreateSolanaFlashTx1ApiResponse } from 'interfaces/lbp/create/solana-flash/api';
import { validateEnvironmentSolana } from 'schema/environment';
import {
  CreateSolanaFlashTx1Api,
  CreateSolanaFlashTx2Api,
} from 'schema/flash-token/solana/api';
import { CreateSolanaFlashInput } from 'schema/flash-token/solana/sdk';
import { SolanaFlashValidator } from 'schema/flash-token/solana/validator';
import { solanaFeeDistributionApiPayloadSchema } from 'schema/lbp/solana/fee-distribution';
import { SolanaChainId } from 'types/chain-id';
import { BasedBidApi, IpfsUpload, SolanaWrapper } from 'utils';

let launchedToken: {
  chainId: SolanaChainId;
  mintAddress: string;
  signature: string;
} | null = null;

export const createFlashTokenSolana = async (args: CreateSolanaFlashInput) => {
  let launchConfirmed = false;

  try {
    const env = validateEnvironmentSolana();

    const input = SolanaFlashValidator.validateInput(args);

    const solanaWrapper = new SolanaWrapper(
      env.SOLANA_RPC_URL,
      env.SOLANA_PRIVATE_KEY,
    );
    await solanaWrapper.init();

    const logoUrl = await IpfsUpload.uploadImage(args.token.metadata.logo);

    const data = input;
    const { token, raydium, meteora, board, boardOwner, fees } = data;

    const metadataIpfs = {
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      totalSupply: token.totalSupply,
      logo: logoUrl,
      twitter: token.metadata.twitter ?? '',
      telegram: token.metadata.telegram ?? '',
      website: token.metadata.website ?? '',
      discord: token.metadata.discord ?? '',
      description: token.metadata.description,
      ...(board && { board }),
      ...(boardOwner && { boardOwner }),
    };

    const metadataUrl = await IpfsUpload.uploadMetadata(metadataIpfs);

    // Determine flashDex value (1 = Meteora, 2 = Raydium)
    const flashDex = args.flashDex === SolanaDexType.METEORA ? 1 : 2;

    // ==================== TX1 ====================
    console.log('\nStep 1 of 3: Creating the token mint');
    console.log(
      'This prepares the token contract address for your Flash Token.',
    );

    const tx1Payload: CreateSolanaFlashTx1Api = {
      chainId: args.chainId,
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

    console.log('Requesting mint creation transaction from basedbid...');

    const tx1Response =
      await BasedBidApi.invokeApi<CreateSolanaFlashTx1ApiResponse>(
        ApiType.SDK,
        'sol/create-flash-tx1',
        tx1Payload,
        'Failed to create flash token mint transaction',
        args.isSandboxMode,
      );

    if (!tx1Response || !tx1Response.transaction) {
      throw new Error(
        'basedbid API Error: Failed to create flash token mint transaction',
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
      {
        description: 'Create Flash Token Mint',
        skipConfirmation: args.isSandboxMode,
      },
    );

    launchedToken = {
      chainId: args.chainId,
      mintAddress: tx1Response.mintAddress,
      signature: tx1Signature,
    };

    await solanaWrapper.awaitTxConfirmation(tx1Signature);

    // ==================== TX2 ====================
    console.log('\nStep 2 of 3: Initializing the Flash Token market');
    console.log(
      'This connects the new token to the selected DEX trading setup.',
    );

    const tx2Payload: CreateSolanaFlashTx2Api = {
      chainId: args.chainId,
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
          raydiumFeeTierIndex: args.raydium.feeTierIndex,
          finalStartPrice: args.raydium.finalStartPrice,
          hasInitialSwap: args.raydium.hasInitialSwap,
          solanaInitialBuyHuman: args.raydium.solanaInitialBuyHuman,
        }),
      // Add Meteora specific fields if applicable
      ...(args.flashDex === SolanaDexType.METEORA &&
        args.meteora && {
          meteoraFeeTierIndex: args.meteora.feeTierIndex,
          meteoraTokenAccountSeed: tx1Response.meteoraTokenAccountSeed,
        }),
    };

    console.log(
      'Requesting market initialization transaction from basedbid...',
    );
    const tx2Response =
      await BasedBidApi.invokeApi<CreateSolanaFlashTx1ApiResponse>(
        ApiType.SDK,
        'sol/create-flash-tx2',
        tx2Payload,
        'Failed to create flash token market transaction',
        args.isSandboxMode,
      );

    if (!tx2Response || !tx2Response.transaction) {
      throw new Error(
        'basedbid API Error: Failed to create flash token market transaction',
      );
    }

    console.log('Market initialization transaction received.');

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
      {
        description: 'Initialize Flash Token Market',
        skipConfirmation: args.isSandboxMode,
      },
    );

    await solanaWrapper.awaitTxConfirmation(tx2Signature);

    console.log(
      `\nStep 3 of ${fees?.feeDistribution ? '4' : '3'}: Confirming the launch with basedbid`,
    );
    console.log('This makes the token visible to basedbid services.');

    await BasedBidApi.invokeApi(
      ApiType.SDK,
      'sol/confirm-launch',
      {
        chainId: args.chainId,
        mintAddress: tx1Response.mintAddress,
        signature: tx1Signature,
      },
      'Failed to confirm launch',
      args.isSandboxMode,
    );
    launchConfirmed = true;

    if (fees?.feeDistribution) {
      console.log('\nStep 4 of 4: Applying Fee Builder settings');
      console.log('This routes post-launch fees using basedbid Fee Builder.');

      const feeDistributionPayload = {
        chainId: args.chainId,
        address: tx1Response.mintAddress,
        ...fees,
        marketingWalletAddress: fees.marketingWalletAddress ?? '',
        feeDistributionPayoutCustomMint:
          fees.feeDistributionPayoutCustomMint ?? '',
        rewardToken: fees.rewardToken ?? '',
      };

      const solanaFeeDistributionValidated =
        solanaFeeDistributionApiPayloadSchema.safeParse(feeDistributionPayload);
      if (!solanaFeeDistributionValidated.success) {
        throw new Error(
          'Invalid fee distribution payload: ' +
            solanaFeeDistributionValidated.error.message,
        );
      }

      await BasedBidApi.invokeApi(
        ApiType.PLATFORM,
        'token/fee-distribution',
        solanaFeeDistributionValidated.data,
        'Failed to set fee distribution on Solana Flash Token',
        args.isSandboxMode,
      );
    }

    return {
      mintAddress: tx1Response.mintAddress,
      tx1Signature,
      tx2Signature,
      metadataUrl,
      meteoraTokenAccountSeed: tx1Response.meteoraTokenAccountSeed,
      positionNftMintAddress: tx1Response.positionNftMintAddress,
    };
  } catch (error) {
    console.error('Error creating Solana flash token: ', error);

    if (launchedToken != null && !launchConfirmed) {
      console.log('\nFlash Token launch did not complete');
      console.log('----------------------------------------');
      console.log(
        'The mint transaction succeeded, but a later setup step failed.',
      );
      console.log(`Mint address: ${launchedToken.mintAddress}`);
      console.log(`Mint tx:      ${launchedToken.signature}`);
      console.log('');
      console.log('Releasing the reserved vanity address with basedbid...');

      await BasedBidApi.invokeApi(
        ApiType.SDK,
        'sol/release-vanity',
        {
          chainId: launchedToken.chainId,
          mintAddress: launchedToken.mintAddress,
          signature: launchedToken.signature,
        },
        'Failed to release vanity',
        args.isSandboxMode,
      );

      console.log('Reserved vanity address released.');
      console.log('You can safely retry the same command.\n');
    }

    throw error;
  }
};
