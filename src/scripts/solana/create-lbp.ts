import 'dotenv/config';

import { SOLANA_BASE_TOKEN_PAIR, SOLANA_DECIMALS } from 'constants/solana';
import {
  SOLANA_CHAIN_NAME_CONFIG,
  SOLANA_CHAIN_SLUG_CONFIG,
} from 'constants/solana-chain-config';
import { ApiType, SolanaDexType } from 'enums';
import { OpenbidRunOptions, SolanaVanityUpdateData } from 'interfaces/common';
import { CreateSolanaLbpApiResponse } from 'interfaces/create-lbp';
import { solanaFeeDistributionApiPayloadSchema } from 'schema/lbp/solana/fee-distribution';
import {
  CreateSolanaLbpInput,
  createSolanaLbpInputSchema,
} from 'schema/lbp/solana/sdk-input';
import {
  BasedBidApi,
  getLaunchPackageIndex,
  IpfsUpload,
  LogHelper,
  SeedGenerator,
  SolanaValidator,
  SolanaWrapper,
} from 'utils';

let launchedToken: SolanaVanityUpdateData | null = null;

export const createSolanaLbp = async (
  args: CreateSolanaLbpInput,
  options?: OpenbidRunOptions,
) => {
  let launchConfirmed = false;

  const { printPayload, dryRun, validate } = options ?? {};

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Creating LBP on Solana - - -');
  }

  try {
    const { data, env } = SolanaValidator.validate<CreateSolanaLbpInput>(
      createSolanaLbpInputSchema,
      args,
      options,
    );

    if (validate) {
      console.log('Validation passed');
      return;
    }

    const solanaWrapper = new SolanaWrapper(env.SOLANA_PRIVATE_KEY);
    await solanaWrapper.init(data.chainId);

    const { token, board, boardOwner, dex, fees } = data;
    const apiKey = board ? process.env.BASEDBID_API_KEY : undefined;

    let sale = data.sale;
    if (!sale) {
      sale = {
        marketCap: '9000',
        maxAllocationPerUser: '0',
        whitelistedAddresses: [],
      };
    }

    let logoUrl = 'https://ipfs.based.bid/ipfs/null';
    if (dryRun) {
      console.log('Skipping logo upload (dry-run mode)');
      console.log('Logo path:', data.token.metadata.logo);
    } else {
      logoUrl = await IpfsUpload.uploadImage(data.token.metadata.logo);
    }

    const seed = SeedGenerator.generateNumericSeed(5);

    const metadata = {
      name: token.name,
      symbol: token.symbol,
      decimals: SOLANA_DECIMALS,
      totalSupply: token.totalSupply,
      logo: logoUrl,
      twitter: token.metadata.twitter ?? '',
      telegram: token.metadata.telegram ?? '',
      website: token.metadata.website ?? '',
      discord: token.metadata.discord ?? '',
      description: token.metadata.description,
      whitelist: sale.whitelistedAddresses,
      ...(board && { board }),
      ...(boardOwner && { boardOwner }),
      seed,
    };

    let metadataUrl = 'https://ipfs.based.bid/ipfs/null';
    if (dryRun) {
      console.log('Skipping metadata upload (dry-run mode)');
      console.log('Seed:', seed);
      console.log('Metadata to upload:', JSON.stringify(metadata, null, 2));
    } else {
      metadataUrl = await IpfsUpload.uploadMetadata(metadata);
    }

    const apiPayload = {
      chainId: args.chainId,
      signer: solanaWrapper.publicKey,
      data: {
        seed,
        advanced: true,
        package: getLaunchPackageIndex(data.package),
        amountsInRaiseToken: true,
        baseTokenAddress: SOLANA_BASE_TOKEN_PAIR,
        baseTokenDecimals: SOLANA_DECIMALS,
        token: {
          name: token.name,
          symbol: token.symbol,
          totalSupply: token.totalSupply,
          decimals: SOLANA_DECIMALS,
          initialBuyAmount: token.initialBuyAmount,
          initialBuySupplyPercent: token.initialBuySupplyPercent,
          metadataUrl,
          raiseTokenDecimals: SOLANA_DECIMALS,
        },
        dex: {
          routerId: dex.version,
          ...(dex.version === SolanaDexType.METEORA && {
            meteoraFeeTierIndex: dex.feeTier,
          }),
          ...(dex.version === SolanaDexType.RAYDIUM && {
            raydiumFeeTierIndex: dex.feeTier,
          }),
        },
        sale: {
          marketCap: sale.marketCap,
          softCap: sale.softCap,
          endTime: sale.endTime,
          startTime: sale.startTime,
          maxAllocationPerUser: sale.maxAllocationPerUser,
          baseTokenForPair: SOLANA_BASE_TOKEN_PAIR,
          baseTokenDecimals: SOLANA_DECIMALS,
          referrer: sale.referrer,
          amountsInRaiseToken: true,
        },
        ...(fees && {
          fees: {
            buyTokenOwnerFee: fees.buyPoolCreator,
            sellTokenOwnerFee: fees.sellPoolCreator,
            buyReferralFee: fees.buyReferral,
            graduation: fees.graduation,
          },
        }),
      },
    };

    if (printPayload) {
      LogHelper.printApiPayload('sol/create-lbp', apiPayload);
    }

    if (dryRun) {
      LogHelper.printDryRunSummary('sol/create-lbp', apiPayload);
      return { dryRun: true, payload: apiPayload };
    }

    const json = await BasedBidApi.invokeApi<CreateSolanaLbpApiResponse>(
      ApiType.SDK,
      'sol/create-lbp',
      apiPayload,
      'Failed to create LBP on Solana',
      args.isSandboxMode,
      apiKey,
    );

    const {
      transaction,
      mintSignerSecretHex,
      blockhash,
      lastValidBlockHeight,
      txCost,
    } = json;

    console.log('\nStep 2 of 3: Creating the token pool on Solana devnet');
    console.log(
      'This creates the token mint and pool transaction for your launch.',
    );

    const mintSigner =
      await solanaWrapper.getSignerFromPrivateKey(mintSignerSecretHex);

    const signature = await solanaWrapper.sendTransaction(
      transaction,
      blockhash,
      lastValidBlockHeight,
      `${txCost?.totalRequired.sol} SOL`,
      [mintSigner.keyPair],
      {
        description: 'Create Solana Pool',
        skipConfirmation: args.isSandboxMode,
      },
    );

    launchedToken = {
      chainId: args.chainId,
      mintAddress: json.mintAddress,
      signature,
    };

    await solanaWrapper.awaitTxConfirmation(signature);

    console.log('\nStep 3 of 3: Registering the pool with basedbid');
    console.log('This makes the pool visible to basedbid services.');

    if (!fees?.feeDistribution) {
      await BasedBidApi.invokeApi(
        ApiType.SDK,
        'sol/confirm-launch',
        {
          chainId: args.chainId,
          mintAddress: json.mintAddress,
          signature,
        },
        'Failed to confirm launch',
        args.isSandboxMode,
        apiKey,
      );
      launchConfirmed = true;

      const result = {
        mintAddress: json.mintAddress,
        signature,
        metadataUrl: json.metadataUrl,
      };

      LogHelper.printResult({
        ok: true,
        type: 'pool',
        network: SOLANA_CHAIN_NAME_CONFIG[args.chainId],
        mintAddress: result.mintAddress,
        signature: result.signature,
        metadataUrl: result.metadataUrl,
        basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${SOLANA_CHAIN_SLUG_CONFIG[args.chainId]}/token/${result.mintAddress}`,
      });

      return result;
    }

    const customFeePercent = fees.customFees.reduce(
      (sum, fee) => sum + fee.percent,
      0,
    );
    const feeDistributionPayload = {
      chainId: args.chainId,
      address: json.mintAddress,
      ...fees,
      customFeePercent,
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
      'Failed to set fee distribution on Solana',
      args.isSandboxMode,
      apiKey,
    );

    await BasedBidApi.invokeApi(
      ApiType.SDK,
      'sol/confirm-launch',
      {
        chainId: args.chainId,
        mintAddress: json.mintAddress,
        signature,
      },
      'Failed to confirm launch',
      args.isSandboxMode,
      apiKey,
    );
    launchConfirmed = true;

    const result = {
      mintAddress: json.mintAddress,
      signature,
      metadataUrl: json.metadataUrl,
    };

    LogHelper.printResult({
      ok: true,
      type: 'pool',
      network: SOLANA_CHAIN_NAME_CONFIG[args.chainId],
      mintAddress: result.mintAddress,
      signature: result.signature,
      metadataUrl: result.metadataUrl,
      basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${SOLANA_CHAIN_SLUG_CONFIG[args.chainId]}/token/${result.mintAddress}`,
    });

    return result;
  } catch (error) {
    LogHelper.printResult({
      ok: false,
      type: 'pool',
      stage: 'create-lbp',
      network: SOLANA_CHAIN_NAME_CONFIG[args.chainId],
      error,
      retryable: launchedToken === null,
      nextSteps:
        launchedToken !== null
          ? [
              'The mint transaction may have succeeded. Try releasing the vanity address and retry.',
            ]
          : ['Check your configuration and try again'],
    });

    if (launchedToken != null && !launchConfirmed) {
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
    }
    throw error;
  }
};
