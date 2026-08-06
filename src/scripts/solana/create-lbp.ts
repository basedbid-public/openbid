import 'dotenv/config';

import {
  SOLANA_BASE_TOKEN_PAIR,
  SOLANA_CHAIN_NAME_CONFIG,
  SOLANA_CHAIN_SLUG_CONFIG,
  SOLANA_DECIMALS,
} from '@constants';
import { ApiType, SolanaDexType } from '@enums';
import {
  CreateSolanaLbpApiResponse,
  OpenbidRunOptions,
  resolveRunMode,
  SolanaVanityUpdateData,
} from '@interfaces';
import {
  buildSolanaFeeDistributionFields,
  CreateSolanaLbpInput,
  createSolanaLbpInputSchema,
} from '@schema';
import {
  BasedBidApi,
  getLaunchPackageIndex,
  IpfsUpload,
  LogHelper,
  printNextSteps,
  retryAsync,
  SeedGenerator,
  SolanaValidator,
  SolanaWrapper,
} from '@utils';

let launchedToken: SolanaVanityUpdateData | null = null;

export const createSolanaLbp = async (
  args: CreateSolanaLbpInput,
  options?: OpenbidRunOptions,
) => {
  let launchConfirmed = false;

  const { printPayload, dryRun, validate } = resolveRunMode(options);

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

    const { token, board, dex, fees } = data;
    const apiKey = board ? process.env.BASEDBID_API_KEY : undefined;

    // Validate the full Fee Builder wire payload BEFORE any SOL is spent.
    // Previously it was only validated after the pool tx was signed and paid
    // for, and a fee failure then skipped confirm-launch entirely.
    const feeDistributionFields = fees?.feeDistribution
      ? buildSolanaFeeDistributionFields(fees)
      : null;

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
        // Custom board launches: the server validates the board exists and
        // derives the on-chain board seed from this field. Previously it was
        // only embedded in IPFS metadata, so the API silently launched on the
        // default board instead.
        ...(board && { board }),
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

    console.log(
      `\nStep 2 of 3: Creating the token pool on ${SOLANA_CHAIN_NAME_CONFIG[args.chainId]}`,
    );
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

    // Confirm the launch BEFORE applying Fee Builder settings: the pool already
    // exists on-chain at this point, and the previous order (fees first) meant a
    // fee-builder failure skipped confirm-launch and released the vanity address
    // of a live pool.
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

    let feeDistributionApplied = false;
    if (feeDistributionFields) {
      // Fields were fully validated before launch; only chainId/address are added here.
      const feeDistributionPayload = {
        chainId: args.chainId,
        address: json.mintAddress,
        ...feeDistributionFields,
      };

      try {
        await retryAsync(
          () =>
            BasedBidApi.invokeApi(
              ApiType.PLATFORM,
              'token/fee-distribution',
              feeDistributionPayload,
              'Failed to set fee distribution on Solana',
              args.isSandboxMode,
              apiKey,
            ),
          { label: 'Fee Builder setup' },
        );
        feeDistributionApplied = true;
      } catch (feeError) {
        // The pool is live and confirmed - a fee-builder failure must not fail
        // the launch; surface recovery steps instead.
        console.error(
          '\nWARNING: Pool launched, but applying Fee Builder settings failed after retries.',
        );
        console.error(
          feeError instanceof Error ? feeError.message : String(feeError),
        );
        printNextSteps('Recover Fee Builder Settings', [
          `Pool ${json.mintAddress} launched successfully - do NOT relaunch.`,
          'Re-apply the same fee settings from the token owner panel on based.bid.',
        ]);
      }
    }

    const result = {
      mintAddress: json.mintAddress,
      signature,
      metadataUrl: json.metadataUrl,
      ...(feeDistributionFields && { feeDistributionApplied }),
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
