import { SOLANA_BASE_TOKEN_PAIR, SOLANA_DECIMALS } from 'constants/solana';
import {
  SOLANA_CHAIN_NAME_CONFIG,
  SOLANA_CHAIN_SLUG_CONFIG,
} from 'constants/solana-chain-config';
import 'dotenv/config';
import { ApiType, SolanaDexType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { CreateLbpSolanaApiResponse } from 'interfaces/lbp/create/solana/api-response';
import { SolanaVanityUpdate } from 'interfaces/solana-vanity-update';
import { validateEnvironmentSolana } from 'schema/environment';
import { createLbpSolanaApiPayloadSchema } from 'schema/lbp/solana/api-request';
import { solanaFeeDistributionApiPayloadSchema } from 'schema/lbp/solana/fee-distribution';
import { CreateSolanaLbpInput } from 'schema/lbp/solana/sdk-input';
import { SolanaLbpValidator } from 'schema/lbp/solana/validator';
import {
  BasedBidApi,
  getLaunchPackageIndex,
  IpfsUpload,
  SeedGenerator,
  SolanaWrapper,
} from 'utils';

let launchedToken: SolanaVanityUpdate | null = null;

export const createSolanaLbp = async (
  args: CreateSolanaLbpInput,
  dryRun?: DryRunOptions,
) => {
  let launchConfirmed = false;

  if (dryRun?.printPayload) {
    console.log('\nSolana Create LBP - Dry Run');
    console.log('-----------------------------------');
  }

  let metadataUrl = 'ipfs://placeholder-metadata-url (DRY RUN)';

  let apiKey: string | undefined;
  try {
    const env = validateEnvironmentSolana();

    const input = SolanaLbpValidator.validateInput(args);

    const solanaWrapper = new SolanaWrapper(
      env.SOLANA_RPC_URL,
      env.SOLANA_PRIVATE_KEY,
    );
    await solanaWrapper.init();

    const data = input;
    const { token, board, boardOwner, dex, fees } = data;
    apiKey = board ? process.env.BASEDBID_API_KEY : undefined;

    let sale = data.sale;

    if (!sale) {
      sale = {
        marketCap: '9000',
        maxAllocationPerUser: '0',
        whitelistedAddresses: [],
      };
    }

    if (dryRun?.printPayload) {
      console.log('Step 1 of 3: Upload pool metadata to IPFS');
      console.log('Token:', token.name, `(${token.symbol})`);
      console.log('Package:', data.package);
      console.log('Board:', board || '(default based board)');
    }

    let logoUrl = 'ipfs://placeholder-logo-url (DRY RUN)';

    if (dryRun?.dryRun) {
      console.log('Skipping IPFS logo upload (dry-run mode)');
      console.log('Logo path:', token.metadata.logo);
    } else {
      logoUrl = await IpfsUpload.uploadImage(token.metadata.logo, apiKey);
    }

    if (dryRun?.printPayload) {
      console.log('Logo URL:', logoUrl);
    }

    const seed = SeedGenerator.generateNumericSeed(5);

    const ipfsMetadata = {
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

    if (dryRun?.dryRun) {
      console.log('Skipping IPFS metadata upload (dry-run mode)');
      console.log('Seed:', seed);
      console.log('Metadata to upload:', JSON.stringify(ipfsMetadata, null, 2));
    } else {
      metadataUrl = await IpfsUpload.uploadMetadata(ipfsMetadata, apiKey);
    }

    const apiPayload = {
      chainId: args.chainId,
      signer: solanaWrapper.publicKey,
      data: {
        isSandboxMode: data.isSandboxMode,
        seed,
        advanced: true,
        package: getLaunchPackageIndex(data.package),
        baseTokenAddress: SOLANA_BASE_TOKEN_PAIR,
        baseTokenDecimals: SOLANA_DECIMALS,
        token: {
          name: token.name,
          symbol: token.symbol,
          totalSupply: token.totalSupply,
          decimals: SOLANA_DECIMALS,
          initialBuyAmount: token.initialBuyAmount,
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
          initialBuyAmount: token.initialBuyAmount,
          startTime: sale.startTime,
          maxAllocationPerUser: sale.maxAllocationPerUser,
          baseTokenForPair: SOLANA_BASE_TOKEN_PAIR,
          baseTokenDecimals: SOLANA_DECIMALS,
          referrer: sale.referrer,
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

    if (dryRun?.printPayload) {
      console.log('\nAPI Payload for /sol/create-lbp:');
      console.log(JSON.stringify(apiPayload, null, 2));
    }

    const validated = createLbpSolanaApiPayloadSchema.safeParse(apiPayload);

    if (!validated.success) {
      throw new Error('Invalid API payload: ' + validated.error.message);
    }

    if (dryRun?.dryRun) {
      console.log('Skipping API call to /sol/create-lbp (dry-run mode)');
      console.log('\n========== DRY RUN COMPLETE ==========');
      console.log('Would have called: POST /sol/create-lbp');
      console.log('Wallet:', solanaWrapper.publicKey);
      console.log('Chain ID:', args.chainId);
      console.log('Token:', token.name, `(${token.symbol})`);
      console.log('DEX:', dex.version, 'fee tier:', dex.feeTier);
      console.log('========================================\n');
      return { dryRun: true, payload: apiPayload };
    }

    const json = await BasedBidApi.invokeApi<CreateLbpSolanaApiResponse>(
      ApiType.SDK,
      'sol/create-lbp',
      validated.data,
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

      console.log('\n--- RESULT ---');
      console.log(
        JSON.stringify(
          {
            ok: true,
            type: 'pool',
            network: SOLANA_CHAIN_NAME_CONFIG[args.chainId],
            mintAddress: result.mintAddress,
            signature: result.signature,
            metadataUrl: result.metadataUrl,
            basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${SOLANA_CHAIN_SLUG_CONFIG[args.chainId]}/token/${result.mintAddress}`,
          },
          null,
          2,
        ),
      );

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

    console.log('\n--- RESULT ---');
    console.log(
      JSON.stringify(
        {
          ok: true,
          type: 'pool',
          network: SOLANA_CHAIN_NAME_CONFIG[args.chainId],
          mintAddress: result.mintAddress,
          signature: result.signature,
          metadataUrl: result.metadataUrl,
          basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${SOLANA_CHAIN_SLUG_CONFIG[args.chainId]}/token/${result.mintAddress}`,
        },
        null,
        2,
      ),
    );

    return result;
  } catch (error) {
    const err = error as Error;
    const networkName =
      args.chainId === 5011 ? 'solana-devnet' : 'solana-' + args.chainId;

    console.log('\n--- RESULT ---');
    console.log(
      JSON.stringify(
        {
          ok: false,
          type: 'pool',
          stage: 'create-lbp',
          network: networkName,
          error: err.message,
          retryable: launchedToken === null,
          nextSteps:
            launchedToken !== null
              ? [
                  'The mint transaction may have succeeded. Try releasing the vanity address and retry.',
                ]
              : ['Check your configuration and try again'],
        },
        null,
        2,
      ),
    );

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
        apiKey,
      );
    }
    throw error;
  }
};
